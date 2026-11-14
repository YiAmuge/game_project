export const GASHARPOON={cooldown:45,duration:12,ammo:5,interval:.2,range:9,angle:100*Math.PI/180,qRange:10,qAngle:135*Math.PI/180,channel:.5,qEvery:.08,projectileSpeed:32,projectileWidth:.45};
export const GASHARPOON_NAME='개화 E.G.O::가스하푼';
export const GASHARPOON_SKILLS={
 basic:'탄식의 메아리',basicText:'고정 탄창 5발을 사용하며 외부 효과로 탄창을 늘리거나 장전할 수 없다. 발사 간격은 0.2초다. 사거리 9·100도 부채꼴 안의 모든 적에게 발사마다 (72 + 대상 최대 체력의 2%) 피해를 입힌다.',
 tactical:'죄책감의 무게',qText:'변신마다 한 번 사용할 수 있다. 0.5초 정신집중 후 사거리 10·135도 부채꼴 안의 모든 적에게 0.08초 간격으로 60 피해를 3번 입히고 1초간 기절시킨다.',
 ultimate:'탈색된 참회',rText:'변신마다 한 번 사용할 수 있다. 0.5초 정신집중 후 사거리 무한의 관통 작살을 발사한다. 적중한 모든 적 챔피언에게 (200 + 대상의 잃은 체력의 10%) 피해를 입히고, 피해 적용 후 체력이 최대 체력의 10% 미만인 대상은 처형한다.',
};
export const GASHARPOON_TEXT='궁극기가 '+GASHARPOON_NAME+'으로 변경된다. 기본 재사용 대기시간 45초. 사용하면 최대 12초간 변신하며 기본공격은 고정 탄창 5발의 탄식의 메아리로, 전술기와 궁극기는 각각 한 번 사용하는 죄책감의 무게와 탈색된 참회로 변경된다. 기본공격 5발과 두 기술을 모두 사용하면 즉시 변신이 종료된다.';
