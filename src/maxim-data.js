export const MAXIM={health:2900,armor:30,speed:4,ammo:3,reload:.9,interval:.7,range:4.5,nearRange:2,dashDamage:155,swingDamage:200,dashSpeed:18,passiveDistance:7.5,passiveCooldown:5,shield:.025,shieldCap:.15,shieldDuration:10,rRefund:5,qCooldown:11,qDuration:7,qStartup:.05,qStep:.1,qSpeedStep:.15,qSpeedCap:3,qRadius:2.8,qDamage:120,qDistance:5,qBonus:70,qBonusCap:420,qStunAfter:2,qStun:1.5,rCooldown:70,rWindup:1,rRange:12,rAngle:150*Math.PI/180,rDamage:750,rStun:2,rArmorDown:.2};
export const MAXIM_DATA={id:40,name:'막심',tag:'MAXIM',role:'돌격',color:'#ee993d',icon:'R',power:3,health:3,armor:3,speed:3,ammo:3,reload:2,range:4.5,damage:155,attackTime:.7,q:11,r:70,passive:'Rhino 시술',basic:'육중한 충돌',tactical:'코뿔소 돌진',ultimate:'대지 강타',brief:'이동으로 보호막을 쌓고 거대한 망치로 전선을 돌파하는 중장갑 전사'};
export const MAXIM_TEXT={
 passiveText:'7.5 이동할 때마다 최대 체력의 2.5% 보호막을 얻고 궁극기 재사용 대기시간이 5초 줄어든다. 보호막은 최대 체력의 15%까지 쌓이며, 획득할 때마다 지속시간이 10초로 갱신된다. 발동 대기시간은 5초다.',
 basicText:'탄창 1개를 소모해 지정 위치로 최대 4.5 돌진하며 경로의 적에게 155 피해를 준다. 2 이내를 조준하면 전방 반원 범위에 망치를 휘둘러 200 피해를 준다. 탄창은 3개이며 1개 장전 시간은 0.9초, 공격 간격은 0.7초다.',
 qText:'버튼을 누르는 동안 커서 방향으로 최대 7초간 돌진한다. 이동속도는 0.1초마다 15%씩 증가해 최대 300%까지 오른다. 돌진 중 기본공격과 다른 기술을 사용할 수 없으며 미니언과 크립을 통과한다.\n\n적 챔피언과 충돌하면 반경 2.8의 모든 적에게 (120 + 돌진 거리 5당 70) 피해를 준다. 거리 비례 추가 피해는 최대 420이며, 2초 이상 돌진했다면 1.5초 기절을 부여한다. 버튼을 놓거나 지형·건물에 부딪히면 돌진이 끝난다. 돌진이 끝난 뒤 11초의 기본 재사용 대기시간이 시작된다.',
 rText:'1초간 망치를 들어 올린 뒤 지정 방향으로 내려찍는다. 사거리 12, 각도 150도의 부채꼴 충격파로 적에게 750 피해를 주고 2초간 기절과 방어력 20% 감소를 부여한다. 기본 재사용 대기시간은 70초다.',
};

export const maximUltimateArea=(origin,angle)=>({kind:'cone',x:origin.x,y:origin.y,angle,range:MAXIM.rRange,spread:MAXIM.rAngle});
