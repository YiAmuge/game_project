# 2.5D 전투 이펙트 코드

Canvas2D 효과는 Three.js 직교 카메라로 투영한다. 게임 `x`, `y`는 바닥 좌표이고 `z`는 높이다. Three.js에서는 X, Z, Y축에 대응한다. [챔피언별 시각 표현](COMBAT_VISUAL_GUIDE.md)에 29명과 변신 상태의 재질·색상·연출을 정리했다.

| 모듈 | 기능 |
| --- | --- |
| `combat-style.js` | 무채색 물리 표현과 기술별 색상·속성, 실제 공격 도형, 몸통 높이. |
| `skill-vfx.js` | 파티클 풀, 이벤트 관찰, 물리 운동, 범위 클리핑, 몸통 피격, 제한된 잔광. |
| `attack-strokes.js` | 겹친 참격, 날카로운 관통, 거친 타격의 캐시된 마스크. |
| `projectile-vfx.js` | 탄환·나이프·못·작살·유리·얼음도끼·검파의 재질과 비행, 레이저. |
| `champion-vfx.js` | 오라·상태 전환, 공식·꽃잎·전류·불꽃·나무·착지·검·손 등 기술별 표현. |
| `organic-particles.js` | 재질별 윤곽·명암 텍스처와 액체·연기의 부드러운 형태 변화. |
| `dash-trails.js` | 돌진·도약의 실제 위치·높이 5프레임을 연결하는 몸체 잔상과 리본. |
| `weapon-trails.js` | 무기의 최대 5프레임 위치를 연결하는 점점 가늘고 투명해지는 리본. |

## 파티클과 피격

수평 속도는 `v₀ × exp(−저항 × 경과시간)`이며 위치는 이를 적분한다. 높이는 `초기 높이 + 수직속도 × 시간 − 중력 × 시간² / 2`이고 바닥 아래로 내려가지 않는다. 수명 비율 `t`에 대해 크기는 `(1−t)^0.8`, 불투명도는 `(1−t)^1.5`다. 무채색 파편은 단단한 윤곽을 유지하며 회전한다. 물·검은 액체·연기는 밀도 노이즈와 형태 교차 합성·비틀림으로 표현한다. 전류는 짧고 빠르게 사라지고, 얼음·물은 빨리 떨어지며, 목편·꽃잎은 감속하며 떠다닌다.

피격 이벤트는 피해자 ID와 공격자·기술 정보를 전달한다. 챔피언 몸통 높이 1.25에서 짧은 충격 자국과 최대 8개 파편을 생성하고, 피해자가 움직이면 위치를 따라간다. 같은 대상의 피격은 0.065초 간격으로 모아서 표시한다. 일반 피격은 흰색·회색이며, 물·전류·불꽃 등은 지정된 기술의 재질을 따른다.

## 실제 범위와 합성

원형은 반경, 부채꼴은 반경·각도·방향, 직사각형은 길이·폭·방향을 공격 판정에서 받는다. 지면의 검기·충격 자국은 해당 도형으로 클리핑하고, 범위를 벗어난 바닥 좌표의 파티클은 표시하지 않는다. `AttackStrokes.fieldTexture()`의 연속적인 재질과 주 이펙트가 범위 안쪽을 끝까지 채운다. 투사체는 실제 폭과 이동 위치를 사용하며 최대 5개 월드 위치로 짧은 꼬리를 표시한다.

지면 장판·오라·범위 표시를 먼저 그리고, 깊이 순서대로 캐릭터와 파편을 합성한다. 몸통 피격·공중 투사체·연출 뒤에 체력·탄약·상태 UI를 그린다. 표식은 평면 몸통 또는 체력 UI에 고정한다. 버프·보호막은 우선순위가 높은 하나의 은은한 오라가 기본이며, 별도 기술의 꽃잎·공식·날개는 해당 상태에 맞춰 표시한다.

바닥 잔광은 강한 지점 최대 8개에 기술 강도에 맞춰 그린다. 캐릭터 하이라이트는 주변 빛을 합산하지 않고 가장 강한 하나를 사용하며 강도는 최대 0.28다. 전체 화면 Bloom 후처리나 매 프레임 GPU 텍스처 업로드는 사용하지 않는다.

## 사용 예시

```js
import { SkillVFX } from './src/skill-vfx.js';

const vfx = new SkillVFX();
vfx.emit('slash', { x: 25, y: 38 }, game.time, {
  radius: 3, angle: Math.PI / 4,
  color: '#e6e7e9', accent: '#ffffff', element: 'metal',
  shape: { kind: 'cone', range: 3, spread: 1.7, angle: Math.PI / 4 },
});
vfx.emit('impact', target, game.time, {
  radius: .45, color: '#e6e7e9', element: 'metal',
  body: true, ownerId: target.id, height: 1.25, count: 8, life: .2,
});

// 게임 연결: 별도 emit 없이 피해·공격·투사체·장판 이벤트를 한 번씩 관찰한다.
vfx.sync(game, camera);
vfx.prepare(camera, width, height);
vfx.drawGround(ctx, camera);
for (const unit of depthSortedUnits) {
  vfx.drawUntil(ctx, unit.y);
  drawUnit(unit);
}
vfx.drawUntil(ctx);
vfx.drawFlashes(ctx, camera);
vfx.drawBodyHits(ctx, camera);
drawHud();
```

독립 사용 시에는 `advance(time)`으로 시각을 갱신한다. `element`는 `metal`, `fire`, `electric`, `ice`, `wood`, `water`, `liquid`, `petal`, `mirror`, `feather`, `blood`를 사용할 수 있다. 카메라는 `worldToScreen({x,y}, height)`와 `scale`, 화면 크기를 제공한다.

파티클 최대 640개, 발생 지점 최대 32개, 챔피언 일회성 연출 최대 72개를 유지한다. 파티클은 풀에서 재사용하고 화면 밖 발생을 생략한다. 색상·재질 스프라이트는 최대 384개, 투사체·참격 착색·캐릭터 틴트는 각각 최대 64개, 범위 재질은 최대 96개를 캐시한다. 렌더러는 게임의 난수·피해·쿨타임·충돌을 변경하지 않는다. 같은 게임 시각에는 같은 위치와 수명을 사용하므로 일시정지 중에도 안정적으로 표시한다.
