"use strict";
/* ===== 판정·이행관리 핵심 로직 (구글 시트 버전과 동일한 코드에서 자동 추출) ===== */
var APP = {
  version: '0.3.0',
  lawBasis: '산업안전보건법 시행규칙 현행 2026. 8. 1. 시행(고용노동부령 제477호) / 별표 4·5 2025. 5. 30. 개정',
  compiledOn: '2026-11-04',
  disclaimer: '본 결과는 업무 참고용이며, 최종 판단은 현행 법령 및 관할 지방고용노동관서 해석에 따릅니다.'
};

var HOURS_HEADER = ['키', '교육과정', '교육대상', '최소시간(시간)', '시기·주기', '분할 실시', '근거', '확인수준'];

var HOURS_SEED = [
  ['REG_OFFICE', '정기교육', '사무직 종사 근로자', 6, '매반기', '', '시행규칙 별표 4 제1호가목', '원문확인'],
  ['REG_SALES', '정기교육', '판매업무에 직접 종사하는 근로자', 6, '매반기', '', '시행규칙 별표 4 제1호가목', '원문확인'],
  ['REG_OTHER', '정기교육', '그 밖의 근로자', 12, '매반기', '', '시행규칙 별표 4 제1호가목', '원문확인'],
  ['HIRE_SHORT', '채용 시 교육', '일용근로자 및 근로계약기간 1주일 이하 기간제근로자', 1, '채용 시', '', '시행규칙 별표 4 제1호나목', '원문확인'],
  ['HIRE_1M', '채용 시 교육', '근로계약기간 1주일 초과 1개월 이하 기간제근로자', 4, '채용 시', '', '시행규칙 별표 4 제1호나목', '원문확인'],
  ['HIRE_REG', '채용 시 교육', '그 밖의 근로자', 8, '채용 시', '', '시행규칙 별표 4 제1호나목', '원문확인'],
  ['CHG_SHORT', '작업내용 변경 시 교육', '일용근로자 및 근로계약기간 1주일 이하 기간제근로자', 1, '작업내용 변경 시', '', '시행규칙 별표 4 제1호다목', '원문확인'],
  ['CHG_REG', '작업내용 변경 시 교육', '그 밖의 근로자', 2, '작업내용 변경 시', '', '시행규칙 별표 4 제1호다목', '원문확인'],
  ['SPEC_SHORT', '특별교육', '일용근로자 및 1주일 이하 기간제근로자 (제39호 제외 작업)', 2, '해당 작업 종사 전', '', '시행규칙 별표 4 제1호라목', '원문확인'],
  ['SPEC_SHORT_39', '특별교육', '일용근로자 및 1주일 이하 기간제근로자 (제39호 타워크레인 신호작업)', 8, '해당 작업 종사 전', '', '시행규칙 별표 4 제1호라목', '원문확인'],
  ['SPEC_REG', '특별교육', '그 밖의 근로자', 16, '해당 작업 종사 전 4시간 이상', '나머지 12시간은 3개월 이내 분할 가능', '시행규칙 별표 4 제1호라목', '원문확인'],
  ['SPEC_REG_INTER', '특별교육', '그 밖의 근로자 (단기간 또는 간헐적 작업)', 2, '해당 작업 종사 전', '', '시행규칙 별표 4 제1호라목', '원문확인'],
  ['CONST_BASIC', '건설업 기초안전보건교육', '건설 일용근로자', 4, '건설 일용근로자로 최초 종사 전', '', '산업안전보건법 제31조, 시행규칙 별표 4 제1호마목', '원문확인'],
  ['SUP_REG', '관리감독자 정기교육', '관리감독자', 16, '연간', '', '시행규칙 별표 4 제1호의2가목', '원문확인'],
  ['SUP_HIRE', '관리감독자 채용 시 교육', '관리감독자', 8, '채용 시', '', '시행규칙 별표 4 제1호의2나목', '원문확인'],
  ['SUP_CHG', '관리감독자 작업내용 변경 시 교육', '관리감독자', 2, '작업내용 변경 시', '', '시행규칙 별표 4 제1호의2다목', '원문확인'],
  ['SUP_SPEC', '관리감독자 특별교육', '관리감독자', 16, '해당 작업 종사 전 4시간 이상', '나머지 12시간은 3개월 이내 분할 가능', '시행규칙 별표 4 제1호의2라목', '원문확인'],
  ['SUP_SPEC_INTER', '관리감독자 특별교육', '관리감독자 (단기간 또는 간헐적 작업)', 2, '해당 작업 종사 전', '', '시행규칙 별표 4 제1호의2라목', '원문확인'],
  ['MSDS', '물질안전보건자료(MSDS) 교육', 'MSDS 대상물질 취급 근로자', '', '배치 시, 신규 물질 도입 시, 유해성·위험성 정보 변경 시', '', '산업안전보건법 제114조제3항, 시행규칙 제169조', '2차자료']
];

var TASKS_HEADER = ['번호', '작업명', '키워드(쉼표로 구분)', '확인 질문(줄바꿈으로 구분)', '판정 방식', '제외 사항', '교육내용', '확인수준'];

var TASKS_SEED = [[1, "고압실 내 작업(잠함공법이나 그 밖의 압기공법으로 대기압을 넘는 기압인 작업실 또는 수갱 내부에서 하는 작업만 해당)", "고압실, 잠함, 압기공법, 케이슨", "", "all", "", "", "원문확인"], [2, "아세틸렌 용접장치 또는 가스집합 용접장치를 사용하는 금속의 용접·용단 또는 가열작업(발생기·도관 등에 의하여 구성되는 용접장치만 해당)", "아세틸렌, 가스용접, 가스집합, 용단, 산소절단", "", "all", "", "", "원문확인"], [3, "밀폐된 장소(탱크 내 또는 환기가 극히 불량한 좁은 장소)에서 하는 용접작업 또는 습한 장소에서 하는 전기용접 작업", "탱크 내 용접, 밀폐 용접, 습한 장소 용접, 전기용접", "", "all", "", "", "원문확인"], [4, "폭발성·물반응성·자기반응성·자기발열성 물질, 자연발화성 액체·고체 및 인화성 액체의 제조 또는 취급작업(시험연구를 위한 취급작업 제외)", "인화성 액체, 폭발성 물질, 자연발화성, 물반응성, 위험물 취급", "", "all", "", "", "원문확인"], [5, "액화석유가스·수소가스 등 인화성 가스 또는 폭발성 물질 중 가스의 발생장치 취급 작업", "LPG, 수소, 인화성 가스, 가스 발생장치", "", "all", "", "", "원문확인"], [6, "화학설비 중 반응기, 교반기·추출기의 사용 및 세척작업", "반응기, 교반기, 추출기, 반응기 세척", "", "all", "", "", "원문확인"], [7, "화학설비의 탱크 내 작업", "화학설비 탱크, 탱크 내부", "", "all", "", "", "원문확인"], [8, "분말·원재료 등을 담은 호퍼·저장창고 등 저장탱크의 내부작업", "호퍼, 사일로, 저장탱크 내부, 저장창고", "", "all", "", "", "원문확인"], [9, "다음 각 목에 정하는 설비에 의한 물건의 가열·건조작업", "건조설비, 건조로, 가열 건조", "위험물 등에 관계되는 건조설비로서 속부피가 1㎥ 이상입니까?\n가목 외 건조설비로서 연료 열원 최대연소소비량 시간당 10kg 이상 또는 전력 열원 정격소비전력 10kW 이상입니까?", "any", "", "", "원문확인"], [10, "집재장치의 조립, 해체, 변경 또는 수리작업 및 이들 설비에 의한 집재 또는 운반 작업", "집재장치, 가선집재, 벌목 운반", "원동기 정격출력이 7.5kW를 초과합니까?\n지간의 경사거리 합계가 350m 이상입니까?\n최대사용하중이 200kg 이상입니까?", "any", "", "", "원문확인"], [11, "동력에 의하여 작동되는 프레스기계를 5대 이상 보유한 사업장에서 해당 기계로 하는 작업", "프레스", "사업장이 동력 프레스기계를 5대 이상 보유하고 있습니까?", "all", "", "", "원문확인"], [12, "목재가공용 기계(둥근톱·띠톱·대패·모떼기기계 및 라우터기, 휴대용 제외)를 5대 이상 보유한 사업장에서 해당 기계로 하는 작업", "목재가공, 둥근톱, 띠톱, 대패, 라우터", "사업장이 해당 목재가공용 기계(휴대용 제외)를 5대 이상 보유하고 있습니까?", "all", "", "", "원문확인"], [13, "운반용 등 하역기계를 5대 이상 보유한 사업장에서의 해당 기계로 하는 작업", "지게차, 하역기계, 컨베이어, 구내운반차", "사업장이 운반용 등 하역기계를 5대 이상 보유하고 있습니까?", "all", "", "", "원문확인"], [14, "1톤 이상의 크레인을 사용하는 작업 또는 1톤 미만의 크레인 또는 호이스트를 5대 이상 보유한 사업장에서 해당 기계로 하는 작업(제39호 작업 제외)", "크레인, 호이스트, 천장크레인, 줄걸이", "1톤 이상의 크레인을 사용합니까?\n1톤 미만 크레인 또는 호이스트를 5대 이상 보유한 사업장입니까?", "any", "타워크레인 신호업무는 제39호로 판정", "", "원문확인"], [15, "건설용 리프트·곤돌라를 이용한 작업", "리프트, 곤돌라, 건설용 리프트", "", "all", "", "", "원문확인"], [16, "주물 및 단조 작업", "주물, 단조, 주조", "", "all", "", "", "원문확인"], [17, "전압이 75볼트 이상인 정전 및 활선작업", "정전작업, 활선작업, 전기작업, 충전부", "작업 대상 전압이 75V 이상입니까?", "all", "", "", "원문확인"], [18, "콘크리트 파쇄기를 사용하여 하는 파쇄작업(2m 이상인 구축물의 파쇄작업만 해당)", "콘크리트 파쇄, 파쇄기, 브레이커", "파쇄 대상 구축물의 높이가 2m 이상입니까?", "all", "", "", "원문확인"], [19, "굴착면의 높이가 2m 이상이 되는 지반 굴착(터널 및 수직갱 외의 갱 굴착 제외) 작업", "굴착, 터파기, 지반굴착", "굴착면의 높이가 2m 이상입니까?", "all", "", "", "원문확인"], [20, "흙막이 지보공의 보강 또는 동바리를 설치하거나 해체하는 작업", "흙막이, 지보공, 버팀보", "", "all", "", "", "원문확인"], [21, "터널 안에서의 굴착작업 또는 같은 작업에서의 터널 거푸집 지보공의 조립 또는 콘크리트 작업", "터널, 터널 굴착, 숏크리트", "", "all", "굴착용 기계를 사용하여 하는 굴착작업 중 근로자가 칼날 밑에 접근하지 않고 하는 작업 제외", "", "원문확인"], [22, "굴착면의 높이가 2m 이상이 되는 암석의 굴착작업", "암석 굴착, 암반", "굴착면의 높이가 2m 이상입니까?", "all", "", "", "원문확인"], [23, "높이가 2m 이상인 물건을 쌓거나 무너뜨리는 작업(하역기계로만 하는 작업 제외)", "적재, 물건 쌓기, 하적, 더미", "쌓거나 무너뜨리는 물건의 높이가 2m 이상이고, 하역기계로만 하는 작업이 아닙니까?", "all", "", "", "원문확인"], [24, "선박에 짐을 쌓거나 부리거나 이동시키는 작업", "선박 하역, 항만 하역, 선적", "", "all", "", "", "원문확인"], [25, "거푸집 동바리의 조립 또는 해체작업", "거푸집, 동바리, 형틀", "", "all", "", "", "원문확인"], [26, "비계의 조립·해체 또는 변경작업", "비계, 비계 설치, 아시바, 시스템비계", "", "all", "", "", "원문확인"], [27, "건축물의 골조, 다리의 상부구조 또는 탑의 금속제의 부재로 구성되는 것(5m 이상인 것만 해당)의 조립·해체 또는 변경작업", "철골, 철골 조립, 교량 상부, 철탑", "해당 금속제 구조물의 높이가 5m 이상입니까?", "all", "", "", "원문확인"], [28, "처마 높이가 5m 이상인 목조건축물의 구조 부재의 조립이나 건축물의 지붕 또는 외벽 밑에서의 설치작업", "목조건축, 지붕 작업", "목조건축물의 처마 높이가 5m 이상입니까?", "all", "", "", "원문확인"], [29, "콘크리트 인공구조물(높이 2m 이상인 것만 해당)의 해체 또는 파괴작업", "해체공사, 구조물 해체, 철거", "해체 대상 콘크리트 구조물의 높이가 2m 이상입니까?", "all", "", "", "원문확인"], [30, "타워크레인을 설치(상승작업 포함)·해체하는 작업", "타워크레인 설치, 타워크레인 해체, 텔레스코핑, 상승작업", "", "all", "", "", "원문확인"], [31, "보일러(소형 보일러 및 각 목에서 정하는 보일러 제외)의 설치 및 취급 작업", "보일러", "소형 보일러이거나 '제외 사항'에 적힌 보일러에 해당합니까? (예이면 비대상)", "invert", "다음 보일러 제외: 몸통 반지름 750mm 이하이고 길이 1,300mm 이하인 증기보일러; 전열면적 3㎡ 이하인 증기보일러; 전열면적 14㎡ 이하인 온수보일러; 전열면적 30㎡ 이하인 관류보일러", "", "원문확인"], [32, "게이지 압력을 ㎠당 1kg 이상으로 사용하는 압력용기의 설치 및 취급작업", "압력용기", "사용 게이지 압력이 1kg/㎠ 이상입니까?", "all", "", "", "원문확인"], [33, "방사선 업무에 관계되는 작업(의료 및 실험용 제외)", "방사선, RT, 비파괴검사", "", "all", "", "", "원문확인"], [34, "밀폐공간에서의 작업", "밀폐공간, 맨홀, 정화조, 탱크 청소, 오수", "", "all", "", "산소농도 측정 및 작업환경에 관한 사항\n사고 시의 응급처치 및 비상 시 구출에 관한 사항\n보호구 착용 및 보호 장비 사용에 관한 사항\n작업내용·안전작업방법 및 절차에 관한 사항\n장비·설비 및 시설 등의 안전점검에 관한 사항\n그 밖에 안전·보건관리에 필요한 사항", "원문확인"], [35, "허가 또는 관리 대상 유해물질의 제조 또는 취급작업", "관리대상 유해물질, 허가대상 유해물질, 유기용제, 특별관리물질", "", "all", "", "취급물질의 성질 및 상태에 관한 사항\n유해물질이 인체에 미치는 영향\n국소배기장치 및 안전설비에 관한 사항\n안전작업방법 및 보호구 사용에 관한 사항\n그 밖에 안전·보건관리에 필요한 사항", "원문확인"], [36, "로봇작업", "로봇, 산업용 로봇, 로봇 교시", "", "all", "", "", "원문확인"], [37, "석면해체·제거작업", "석면, 석면 해체, 석면 제거", "", "all", "", "", "원문확인"], [38, "가연물이 있는 장소에서 하는 화재위험작업", "용접, 용단, 화기작업, 그라인딩, 불꽃", "", "all", "", "작업준비 및 작업절차에 관한 사항\n작업장 내 위험물, 가연물의 사용·보관·설치 현황에 관한 사항\n화재위험작업에 따른 인근 인화성 액체에 대한 방호조치에 관한 사항\n화재위험작업으로 인한 불꽃, 불티 등의 비산방지조치에 관한 사항\n인화성 액체의 증기가 남아 있지 않도록 환기 등의 조치에 관한 사항\n화재감시자의 직무 및 피난교육 등 비상조치에 관한 사항\n그 밖에 안전·보건관리에 필요한 사항", "원문확인"], [39, "타워크레인을 사용하는 작업 시 신호업무를 하는 작업", "타워크레인 신호, 신호수, 신호작업", "", "all", "", "타워크레인의 기계적 특성 및 방호장치 등에 관한 사항\n화물의 취급 및 안전작업방법에 관한 사항\n신호방법 및 요령에 관한 사항\n인양 물건의 위험성 및 낙하·비래·충돌재해 예방에 관한 사항\n인양물이 적재될 지반의 조건, 인양하중, 풍압 등이 인양물과 타워크레인에 미치는 영향\n그 밖에 안전·보건관리에 필요한 사항", "원문확인"]];

var NOTICE_HEADER = ['조문', '제목', '트리거', '트리거 설명', '확인수준'];

var NOTICE_SEED = [
  ['안전보건규칙 제440조', '특별관리물질의 고지', 'sub_special', '특별관리물질 취급', '확인필요'],
  ['안전보건규칙 제449조', '유해성 등의 주지 (관리대상 유해물질)', 'sub_managed', '관리대상 유해물질 취급', '확인필요'],
  ['안전보건규칙 제460조', '유해성 등의 주지 (허가대상 유해물질)', 'sub_permit', '허가대상 유해물질 취급', '확인필요'],
  ['안전보건규칙 제486조', '직업성 질병의 주지 (석면)', 'task_37', '석면해체·제거작업', '확인필요'],
  ['안전보건규칙 제514조', '소음수준의 주지 등', 'hz_noise', '소음작업', '확인필요'],
  ['안전보건규칙 제519조', '유해성 등의 주지 (진동작업)', 'hz_vibration', '진동작업', '확인필요'],
  ['안전보건규칙 제591조', '유해성 등의 주지 (방사선)', 'task_33', '방사선 업무', '확인필요'],
  ['안전보건규칙 제595조', '유해성 등의 주지 (병원체)', 'hz_pathogen', '병원체 노출 작업', '확인필요'],
  ['안전보건규칙 제614조', '분진의 유해성 등의 주지', 'hz_dust', '분진작업', '확인필요'],
  ['안전보건규칙 제641조', '안전한 작업방법 등의 주지 (밀폐공간)', 'task_34', '밀폐공간 작업', '확인필요'],
  ['안전보건규칙 제661조', '유해성 등의 주지 (근골격계부담작업)', 'hz_msd', '근골격계부담작업', '확인필요']
];

var RULES_HEADER = ['규칙ID', '조건 (이럴 때)', '결과 (이렇게 판정)', '근거', '확인수준'];

var RULES_SEED = [
  ['A-01', '관리감독자가 아닌 근로자', '정기교육 대상. 사무직·판매직 매반기 6시간, 그 밖의 근로자 매반기 12시간', '별표 4 제1호가목', '원문확인'],
  ['A-02', '일용근로자 또는 1주일 이하 기간제근로자의 정기교육', '"판단 필요"로 표시 (반기 단위 교육을 단기 고용자에게 어떻게 적용할지 해석 필요)', '해석 쟁점', '확인필요'],
  ['A-03', '신규 채용 + 일용·1주일 이하', '채용 시 교육 1시간', '별표 4 제1호나목', '원문확인'],
  ['A-04', '신규 채용 + 1주일 초과 1개월 이하 기간제', '채용 시 교육 4시간', '별표 4 제1호나목', '원문확인'],
  ['A-05', '신규 채용 + 그 밖의 근로자', '채용 시 교육 8시간', '별표 4 제1호나목', '원문확인'],
  ['A-06', '작업내용 변경 + 일용·1주일 이하', '작업내용 변경 시 교육 1시간', '별표 4 제1호다목', '원문확인'],
  ['A-07', '작업내용 변경 + 그 밖의 근로자 (1개월 이하 기간제 포함)', '작업내용 변경 시 교육 2시간', '별표 4 제1호다목', '원문확인'],
  ['A-08', '특별교육 대상 작업(1~38호) + 일용·1주일 이하', '특별교육 2시간', '별표 4 제1호라목', '원문확인'],
  ['A-09', '특별교육 대상 작업 제39호(타워크레인 신호) + 일용·1주일 이하', '특별교육 8시간', '별표 4 제1호라목', '원문확인'],
  ['A-10', '특별교육 대상 작업 + 그 밖의 근로자', '특별교육 16시간 (종사 전 4시간 이상, 나머지 12시간은 3개월 이내 분할 가능)', '별표 4 제1호라목', '원문확인'],
  ['A-11', 'A-10에서 단기간 또는 간헐적 작업에 "예"', '특별교육 2시간', '별표 4 제1호라목', '원문확인'],
  ['A-12', 'A-10에서 단기간 또는 간헐적 작업에 "모름"', '16시간으로 표시하되 "판단 필요" (단기간·간헐적 기준 미확인)', '해석 쟁점', '확인필요'],
  ['A-13', '특별교육이 대상인데 채용 시 또는 작업내용 변경 시 교육도 발생', '채용 시·변경 시 교육은 "특별교육으로 갈음"으로 표시', '시행규칙 제26조', '원문확인'],
  ['A-14', '특별교육 대상 작업이 2개 이상', '작업별로 각각 표시하고 "복수 작업 공통내용 중복 인정 여부 해석 필요" 비고', '질의회시(2차자료)', '2차자료'],
  ['A-15', '건설 일용근로자', '건설업 기초안전보건교육 4시간 (최초 종사 전)', '법 제31조, 별표 4 제1호마목', '원문확인'],
  ['A-16', '감면 대상 사업에 "예"', '정기·채용 시·변경 시·특별교육(가~라목) 시간을 1/2 이상으로 할 수 있음을 함께 표시. 건설업 기초교육은 감면 없음', '별표 4 비고 제3호', '원문확인'],
  ['A-17', '관리감독자', '연간 16시간 정기교육. 채용 시 8시간, 변경 시 2시간, 특별교육 16시간(단기간·간헐적 2시간)', '별표 4 제1호의2', '원문확인'],
  ['A-18', '작업의 확인 질문에 "아니오" (수치 요건 미충족)', '해당 작업은 "비대상"으로 표시', '별표 5 제1호라목', '원문확인'],
  ['A-19', '작업의 확인 질문에 "모름"', '해당 작업은 "판단 필요"로 표시', '-', '-'],
  ['A-20', '정기교육은 특별교육으로 대체되지 않음', '특별교육 대상이어도 정기교육을 별도로 표시', '질의회시(2차자료)', '2차자료'],
  ['B-01', 'MSDS 대상물질 취급 + (신규 채용, 작업 변경, 신규 물질 도입, MSDS 변경 중 하나)', 'MSDS 교육 대상. 법정 최소 시간 없음. 실시 시간만큼 제29조 교육으로 인정', '법 제114조제3항, 시행규칙 제169조', '2차자료'],
  ['B-02', 'MSDS 대상물질 취급 + 위 사유 없음', 'MSDS 교육 "참고" 표시 (사유 발생 시 실시)', '시행규칙 제169조', '2차자료'],
  ['B-03', '관리대상 또는 허가대상 유해물질 취급', '특별교육 제35호를 자동 포함', '별표 5 제1호라목 제35호', '원문확인'],
  ['C-01', '해당 유해인자·물질·작업이 있음', '안전보건규칙상 유해성 주지 의무 표시 (시간 규정 없음)', '안전보건규칙 각 조', '확인필요'],
  ['D-01', '타 법령 교육 표시를 켬', '화학물질관리법 유해화학물질 취급자 교육을 "확인필요"로 표시', '화학물질관리법', '확인필요']
];

var ISSUES_HEADER = ['번호', '쟁점', '앱 처리 방식', '상태'];

var ISSUES_SEED = [
  [1, '단기간·간헐적 작업의 판단 기준 (특별교육 16시간 ↔ 2시간)', '사용자가 예/아니오/모름 선택. 모름이면 판단 필요', '미해결'],
  [2, '특별교육 대상 작업이 여러 개일 때 공통내용 중복 인정 여부', '작업별로 각각 표시 + 비고', '미해결'],
  [3, '정기교육 "반기"의 기산 기준 (달력 반기인지 채용일 기준인지)', '주기만 표시, 기한 계산은 3단계에서', '미해결'],
  [4, '일용근로자·1주일 이하 기간제의 정기교육 적용 방법', '판단 필요로 표시', '미해결'],
  [5, 'MSDS 교육 적정 시간 (법정 시간 없음)', '시간 공란, 비고 표시', '미해결'],
  [6, '1/2 감면 대상 사업(영 별표 1 제1호) 범위', '사용자가 해당 여부 선택', '원문 대조 필요'],
  [7, '시행규칙 제169조 원문 및 MSDS 교육 기록 보존 기간', '2차자료 기준 표시', '원문 대조 필요'],
  [8, '관리감독자 타 법령 교육 시간 면제 조문 (2025. 6. 1. 시행)', '미반영', '원문 대조 필요'],
  [9, '안전보건규칙 유해성 주지 조문별 알려야 할 사항', '조문·제목만 표시', '원문 대조 필요']
];

function buildData(hourRows, taskRows, noticeRows) {
  var hours = {};
  hourRows.forEach(function (r) {
    hours[String(r[0]).trim()] = {
      key: String(r[0]).trim(), course: r[1], target: r[2],
      hours: r[3] === '' || r[3] === null ? null : Number(r[3]),
      timing: r[4], split: r[5], basis: r[6], level: r[7]
    };
  });
  var tasks = taskRows.map(function (r) {
    return {
      no: Number(r[0]), name: String(r[1]),
      keywords: String(r[2] || '').split(',').map(function (s) { return s.trim(); }).filter(String),
      questions: String(r[3] || '').split('\n').map(function (s) { return s.trim(); }).filter(String),
      logic: String(r[4] || 'all').trim(),
      exclusion: String(r[5] || ''),
      content: String(r[6] || ''),
      level: r[7]
    };
  });
  var notices = noticeRows.map(function (r) {
    return { article: r[0], title: r[1], trigger: String(r[2]).trim(), triggerLabel: r[3], level: r[4] };
  });
  return { hours: hours, tasks: tasks, notices: notices };
}

var LABELS = {
  job: { office: '사무직', sales: '판매업무 직접 종사', other: '그 밖의 근로자', supervisor: '관리감독자' },
  emp: { daily: '일용근로자', fixed_1w: '1주일 이하 기간제', fixed_1m: '1주일 초과 1개월 이하 기간제', regular: '그 밖의 근로자(1개월 초과 기간제·정규직 등)' }
};

function judgeCore(data, input) {
  var H = data.hours;
  var rows = [];
  var notes = [];
  var isSup = input.job === 'supervisor';
  var emp = isSup ? 'regular' : input.emp;
  var shortEmp = emp === 'daily' || emp === 'fixed_1w';
  var sub = input.sub || {};
  var hz = input.hz || {};

  function hoursText(h, half) {
    if (h.hours === null || h.hours === undefined) return '법정 시간 없음';
    var t = h.hours + '시간 이상';
    if (half) t += ' (감면 시 ' + (h.hours / 2) + '시간 이상)';
    return t;
  }
  function add(layer, h, status, reason, extra) {
    extra = extra || {};
    rows.push({
      layer: layer,
      course: extra.course || h.course,
      status: status,
      reason: reason,
      hoursText: extra.hoursText !== undefined ? extra.hoursText : hoursText(h, extra.half),
      timing: extra.timing || h.timing || '',
      basis: extra.basis || h.basis || '',
      note: extra.note || '',
      level: extra.level || h.level || '',
      key: h.key,
      hoursNum: h.hours
    });
  }

  /* 특별교육 작업 판정 */
  var taskMap = {};
  data.tasks.forEach(function (t) { taskMap[t.no] = t; });
  var selected = (input.tasks || []).slice();
  var autoNote35 = false;
  if ((sub.managed || sub.permit) && !selected.some(function (t) { return Number(t.no) === 35; })) {
    selected.push({ no: 35, answers: [], intermittent: 'unknown', auto: true });
    autoNote35 = true;
  }
  var specialResults = selected.map(function (sel) {
    var t = taskMap[Number(sel.no)];
    if (!t) return null;
    var answers = sel.answers || [];
    var status = '대상';
    var why = '';
    if (t.questions.length) {
      var a = t.questions.map(function (_, i) { return answers[i] || 'unknown'; });
      if (t.logic === 'invert') {
        if (a[0] === 'yes') { status = '비대상'; why = '제외 요건에 해당'; }
        else if (a[0] === 'unknown') { status = '판단 필요'; why = '제외 요건 해당 여부 미확인'; }
      } else if (t.logic === 'any') {
        if (a.indexOf('yes') >= 0) { status = '대상'; }
        else if (a.every(function (x) { return x === 'no'; })) { status = '비대상'; why = '수치 요건 미충족'; }
        else { status = '판단 필요'; why = '수치 요건 일부 미확인'; }
      } else {
        if (a.indexOf('no') >= 0) { status = '비대상'; why = '수치 요건 미충족'; }
        else if (a.indexOf('unknown') >= 0) { status = '판단 필요'; why = '수치 요건 미확인'; }
      }
    }
    return { task: t, sel: sel, status: status, why: why };
  }).filter(Boolean);

  var specialActive = specialResults.filter(function (s) { return s.status !== '비대상'; });
  var specialConfirmed = specialResults.some(function (s) { return s.status === '대상'; });

  /* 층위 A: 정기교육 */
  if (isSup) {
    add('A', H.SUP_REG, '대상', '관리감독자', { half: input.halfTime });
  } else {
    var regKey = input.job === 'office' ? 'REG_OFFICE' : input.job === 'sales' ? 'REG_SALES' : 'REG_OTHER';
    if (shortEmp) {
      add('A', H[regKey], '판단 필요', LABELS.job[input.job] + ' / ' + LABELS.emp[emp],
        { half: input.halfTime, note: '반기 단위 정기교육을 일용·1주일 이하 근로자에게 적용하는 방법은 해석 필요' });
    } else {
      add('A', H[regKey], '대상', LABELS.job[input.job], { half: input.halfTime, note: '특별교육으로 대체되지 않음' });
    }
  }

  /* 층위 A: 채용 시 / 작업내용 변경 시 */
  var replaced = specialConfirmed ? '특별교육을 실시하면 이 교육을 실시한 것으로 봄 (시행규칙 제26조)' : '';
  if (input.newHire) {
    var hk = isSup ? 'SUP_HIRE' : shortEmp ? 'HIRE_SHORT' : emp === 'fixed_1m' ? 'HIRE_1M' : 'HIRE_REG';
    add('A', H[hk], specialConfirmed ? '갈음 가능' : '대상', '신규 채용', { half: input.halfTime, note: replaced });
  }
  if (input.taskChange) {
    var ck = isSup ? 'SUP_CHG' : shortEmp ? 'CHG_SHORT' : 'CHG_REG';
    add('A', H[ck], specialConfirmed ? '갈음 가능' : '대상', '작업내용 변경', { half: input.halfTime, note: replaced });
  }

  /* 층위 A: 특별교육 */
  specialResults.forEach(function (s) {
    var t = s.task;
    var label = '제' + t.no + '호 ' + t.name;
    if (s.status === '비대상') {
      rows.push({ layer: 'A', course: '특별교육', status: '비대상', reason: label, hoursText: '-', timing: '', basis: '별표 5 제1호라목 제' + t.no + '호', note: s.why, level: t.level, key: 'SPEC_NONE', hoursNum: null, taskNo: t.no });
      return;
    }
    var key, extraNote = '', status = s.status;
    if (shortEmp) {
      key = t.no === 39 ? 'SPEC_SHORT_39' : 'SPEC_SHORT';
    } else {
      var inter = s.sel.intermittent || 'unknown';
      if (inter === 'yes') key = isSup ? 'SUP_SPEC_INTER' : 'SPEC_REG_INTER';
      else {
        key = isSup ? 'SUP_SPEC' : 'SPEC_REG';
        if (inter === 'unknown') {
          extraNote = '단기간·간헐적 작업이면 2시간 이상. 해당 여부 판단 기준은 확인 필요';
          if (status === '대상') status = '판단 필요';
        }
      }
    }
    var h = H[key];
    var noteParts = [];
    if (s.why) noteParts.push(s.why);
    if (extraNote) noteParts.push(extraNote);
    if (h.split) noteParts.push(h.split);
    if (s.sel.auto) noteParts.push('관리·허가대상 유해물질 취급 입력에 따라 자동 포함');
    if (t.exclusion) noteParts.push('제외: ' + t.exclusion);
    if (specialActive.length > 1) noteParts.push('복수 작업의 공통내용 중복 인정 여부는 해석 필요');
    rows.push({
      layer: 'A', course: '특별교육', status: status, reason: label,
      hoursText: hoursText(h, input.halfTime), timing: h.timing,
      basis: h.basis + ', 별표 5 제1호라목 제' + t.no + '호',
      note: noteParts.join(' / '), level: h.level, content: t.content,
      key: key, hoursNum: h.hours, taskNo: t.no
    });
  });

  /* 층위 A: 건설업 기초 */
  if (input.constructionDaily) {
    add('A', H.CONST_BASIC, '대상', '건설 일용근로자', { note: '이전에 이수한 경우 이수증 확인. 1/2 감면 대상 아님' });
  }

  /* 층위 B: MSDS */
  if (sub.msds || sub.managed || sub.permit || sub.special) {
    var reasons = [];
    if (input.newHire || input.taskChange) reasons.push('대상물질 취급 작업 배치');
    if (sub.newSubstance) reasons.push('신규 대상물질 도입');
    if (sub.msdsRevised) reasons.push('유해성·위험성 정보 변경');
    if (reasons.length) {
      add('B', H.MSDS, '대상', reasons.join(', '), { hoursText: '법정 시간 없음', note: '실시한 시간만큼 법 제29조 안전보건교육으로 인정. 유해성이 유사한 물질은 그룹 교육 가능. 교육시간·내용 기록 보존' });
    } else {
      add('B', H.MSDS, '참고', 'MSDS 대상물질 취급 (현재 발생 사유 없음)', { hoursText: '법정 시간 없음', note: '배치, 신규 물질 도입, MSDS 변경 시 실시' });
    }
  }

  /* 층위 C: 유해성 주지 */
  var triggers = {
    sub_special: sub.special, sub_managed: sub.managed, sub_permit: sub.permit,
    hz_noise: hz.noise, hz_vibration: hz.vibration, hz_dust: hz.dust, hz_pathogen: hz.pathogen, hz_msd: hz.msd
  };
  specialActive.forEach(function (s) { triggers['task_' + s.task.no] = true; });
  data.notices.forEach(function (n) {
    if (triggers[n.trigger]) {
      rows.push({ layer: 'C', course: '유해성 주지: ' + n.title, status: '대상', reason: n.triggerLabel, hoursText: '시간 규정 없음 (알려야 할 의무)', timing: '작업 배치 시', basis: n.article, note: '알려야 할 사항은 조문 원문 확인 필요', level: n.level, key: 'NOTICE', hoursNum: null, article: String(n.article).replace('안전보건규칙 ', '') });
    }
  });

  /* 층위 D: 타 법령 */
  if (input.otherLaws) {
    rows.push({ layer: 'D', course: '유해화학물질 취급자 교육', status: '판단 필요', reason: '타 법령 표시 켬', hoursText: '확인 필요', timing: '확인 필요', basis: '화학물질관리법', note: '산업안전보건법 교육과 별개. 적용 대상·시간 원문 확인 필요', level: '확인필요', key: 'OTHER', hoursNum: null });
  }

  if (autoNote35) notes.push('관리대상 또는 허가대상 유해물질 취급을 입력하여 특별교육 제35호를 자동 포함했습니다.');
  if (input.halfTime) notes.push('감면 대상 사업: 별표 4 비고 제3호에 따라 가목~라목 교육시간을 1/2 이상으로 할 수 있습니다. 건설업 기초안전보건교육은 감면되지 않습니다.');
  if (emp === 'daily') notes.push('일용근로자가 채용 시 교육 또는 특별교육을 받은 날부터 1주일 이내에 같은 사업장·같은 업무로 다시 종사하면 해당 교육이 면제됩니다 (별표 4 비고 제2호).');

  var pendingCount = rows.filter(function (r) { return r.status === '판단 필요'; }).length;
  return {
    rows: rows,
    notes: notes,
    summary: {
      jobLabel: LABELS.job[input.job] || '',
      empLabel: isSup ? '-' : (LABELS.emp[emp] || ''),
      pendingCount: pendingCount
    },
    app: APP
  };
}

/* ═════════════════════════ 3단계: 이행 관리 (교육계획·이수기록·현황) ═════════════════════════ */

var WORKER_HEADER = ['사번', '이름', '직무 구분', '고용 형태', '건설 일용(Y/N)', '감면 사업(Y/N)', '채용일', '현 작업 배치일',
  '신규 채용(Y/N)', '작업내용 변경(Y/N)', '특별교육 작업 번호', '단기간·간헐 여부', 'MSDS 대상물질(Y/N)', '관리대상 유해물질(Y/N)',
  '허가대상 유해물질(Y/N)', '특별관리물질(Y/N)', '신규 물질 도입(Y/N)', 'MSDS 변경(Y/N)', '유해인자', '메모'];

var PLAN_HEADER = ['계획ID', '사번', '이름', '층위', '교육 종류', '세부', '판정', '법정 최소시간', '선행 기한(4시간)', '최종 기한', '이수 시간', '진행률', '상태', '근거', '비고'];

var JOB_MAP = { '사무직': 'office', '판매': 'sales', '판매업무 직접 종사': 'sales', '그 밖의 근로자': 'other', '관리감독자': 'supervisor' };

var EMP_MAP = { '정규·그 밖의 근로자': 'regular', '그 밖의 근로자': 'regular', '정규직': 'regular', '1주 초과 1개월 이하': 'fixed_1m', '1주 이하': 'fixed_1w', '일용': 'daily', '일용근로자': 'daily' };

var HZ_MAP = { '소음': 'noise', '진동': 'vibration', '분진': 'dust', '병원체': 'pathogen', '근골격계': 'msd' };

var ANS_MAP = { '예': 'yes', '아니오': 'no', '모름': 'unknown', 'y': 'yes', 'n': 'no' };

function yn_(v) { var s = String(v == null ? '' : v).trim().toUpperCase(); return v === true || s === 'Y' || s === '예' || s === 'O' || s === 'TRUE'; }

function toDate_(v) { if (!v) return null; if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate()); var mm = String(v).trim().match(/^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/); if (mm) return new Date(Number(mm[1]), Number(mm[2]) - 1, Number(mm[3])); var d = new Date(String(v).replace(/\./g, '-').trim()); return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

function addMonths_(d, n) { var r = new Date(d.getFullYear(), d.getMonth() + n, d.getDate()); return r; }

function dayDiff_(a, b) { return Math.round((toDate_(a) - toDate_(b)) / 86400000); }

function fmt_(d) { if (!d) return ''; d = toDate_(d); var m = d.getMonth() + 1, day = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day; }

function workerToInput(w) {
  var tasks = [];
  var inter = {};
  String(w['단기간·간헐 여부'] || '').split(/[,;]/).forEach(function (p) {
    var m = p.match(/(\d+)\s*=\s*(예|아니오|모름)/);
    if (m) inter[Number(m[1])] = ANS_MAP[m[2]];
  });
  var re = /(\d+)\s*(\(([^)]*)\))?/g, m;
  var src = String(w['특별교육 작업 번호'] || '');
  while ((m = re.exec(src)) !== null) {
    var answers = m[3] ? m[3].split(',').map(function (a) { return ANS_MAP[a.trim().toLowerCase()] || ANS_MAP[a.trim()] || 'unknown'; }) : [];
    tasks.push({ no: Number(m[1]), answers: answers, intermittent: inter[Number(m[1])] || 'unknown' });
  }
  var hz = {};
  String(w['유해인자'] || '').split(/[,;]/).forEach(function (h) { var k = HZ_MAP[h.trim()]; if (k) hz[k] = true; });
  return {
    workerName: w['이름'],
    job: JOB_MAP[String(w['직무 구분']).trim()] || 'other',
    emp: EMP_MAP[String(w['고용 형태']).trim()] || 'regular',
    constructionDaily: yn_(w['건설 일용(Y/N)']), halfTime: yn_(w['감면 사업(Y/N)']),
    newHire: yn_(w['신규 채용(Y/N)']), taskChange: yn_(w['작업내용 변경(Y/N)']),
    tasks: tasks,
    sub: { msds: yn_(w['MSDS 대상물질(Y/N)']), managed: yn_(w['관리대상 유해물질(Y/N)']), permit: yn_(w['허가대상 유해물질(Y/N)']),
      special: yn_(w['특별관리물질(Y/N)']), newSubstance: yn_(w['신규 물질 도입(Y/N)']), msdsRevised: yn_(w['MSDS 변경(Y/N)']) },
    hz: hz, otherLaws: false
  };
}

function plansForWorker(data, w, base) {
  var input = workerToInput(w);
  var r = judgeCore(data, input);
  var id = String(w['사번']).trim();
  var hire = toDate_(w['채용일']);
  var assign = toDate_(w['현 작업 배치일']) || hire;
  var y = base.getFullYear();
  var half = base.getMonth() < 6 ? 'H1' : 'H2';
  var halfEnd = half === 'H1' ? new Date(y, 5, 30) : new Date(y, 11, 31);
  var plans = [];
  r.rows.forEach(function (x) {
    if (['대상', '판단 필요', '갈음 가능'].indexOf(x.status) < 0) return;
    var p = { worker: id, name: w['이름'], layer: x.layer, course: x.course, detail: x.reason, judgment: x.status,
      hours: x.hoursNum == null ? null : (input.halfTime && x.key !== 'CONST_BASIC' && x.layer === 'A' ? x.hoursNum / 2 : x.hoursNum),
      pre: null, final: null, basis: x.basis, note: x.note };
    var k = x.key || '';
    if (/^(REG_|SUP_REG)/.test(k)) {
      var sup = k === 'SUP_REG';
      p.id = id + '-정기-' + (sup ? y : y + half);
      p.detail = (sup ? y + '년 (연간)' : y + '년 ' + (half === 'H1' ? '상반기' : '하반기')) + ' · ' + x.reason;
      p.final = sup ? new Date(y, 11, 31) : halfEnd;
      p.note = (p.note ? p.note + ' / ' : '') + '반기 기산은 달력 기준으로 계산 (확인필요목록 3번)';
    } else if (/HIRE/.test(k)) { p.id = id + '-채용'; p.final = hire; }
    else if (/CHG/.test(k)) { p.id = id + '-변경'; p.final = assign; }
    else if (/SPEC/.test(k)) {
      p.id = id + '-특별' + x.taskNo;
      if (x.hoursNum === 16) { p.pre = assign; p.final = addMonths_(assign, 3); }
      else p.final = assign;
    }
    else if (k === 'CONST_BASIC') { p.id = id + '-건설기초'; p.final = assign; }
    else if (k === 'MSDS') { p.id = id + '-MSDS'; p.final = assign; }
    else if (k === 'NOTICE') { p.id = id + '-주지-' + x.article; p.final = assign; }
    else if (k === 'OTHER') { p.id = id + '-타법'; }
    else return;
    plans.push(p);
  });
  return plans;
}

function computeStatus(plans, records, base) {
  var sums = {}, counts = {};
  records.forEach(function (rc) {
    var pid = String(rc.planId).trim();
    sums[pid] = (sums[pid] || 0) + (Number(rc.hours) || 0);
    counts[pid] = (counts[pid] || 0) + 1;
  });
  function evalOne(p) {
    var sum = sums[p.id] || 0, cnt = counts[p.id] || 0;
    p.done = sum;
    p.rate = p.hours ? Math.min(1, sum / p.hours) : (cnt > 0 ? 1 : 0);
    var complete = p.hours ? sum >= p.hours - 1e-9 : cnt > 0;
    if (complete) return '완료';
    if (p.final && dayDiff_(base, p.final) > 0) return '기한 경과';
    if (p.pre && dayDiff_(base, p.pre) > 0 && sum < 4) return '기한 경과(선행 4시간)';
    if (sum > 0) return '진행 중';
    var next = p.pre && sum < 4 ? p.pre : p.final;
    if (next && dayDiff_(next, base) <= 14) return '기한 임박';
    return '미실시';
  }
  plans.forEach(function (p) { if (p.judgment !== '갈음 가능') p.state = evalOne(p); });
  plans.forEach(function (p) {
    if (p.judgment !== '갈음 가능') return;
    var specials = plans.filter(function (q) { return q.worker === p.worker && /-특별\d+$/.test(q.id); });
    var own = evalOne(p);
    if (own === '완료') p.state = '완료';
    else if (specials.length && specials.every(function (q) { return q.state === '완료'; })) { p.state = '완료(갈음)'; p.rate = 1; }
    else p.state = '갈음 대기';
  });
  return plans;
}

function compareExpected(expected, plans) {
  var byId = {};
  plans.forEach(function (p) { byId[p.id] = p; });
  var seen = {};
  var rows = expected.map(function (e) {
    var p = byId[e[0]];
    seen[e[0]] = true;
    if (!p) return e.concat(['(계획 없음)', '', '', '불일치']);
    var hrs = p.hours == null ? '-' : p.hours;
    var ok = String(hrs) === String(e[3]) && p.judgment === e[4] && p.state === e[5];
    return e.concat([p.judgment, hrs, p.state, ok ? '일치' : '불일치']);
  });
  plans.forEach(function (p) {
    if (!seen[p.id]) rows.push([p.id, p.name, p.course, '', '', '', '정답표에 없는 계획', p.judgment, p.hours == null ? '-' : p.hours, p.state, '불일치']);
  });
  return rows;
}

var STATE_COLORS = { '완료': '#d9f2e1', '완료(갈음)': '#d9f2e1', '진행 중': '#e3ecfa', '미실시': '#ffffff', '기한 임박': '#fff1cc', '기한 경과': '#fadbd8', '기한 경과(선행 4시간)': '#fadbd8', '갈음 대기': '#eef0f3' };

var DEMO_BASE = '2026-11-04';

var DEMO_WORKERS = [
  ['W01', '가상일', '사무직', '정규·그 밖의 근로자', 'N', 'N', '2026-03-02', '2026-03-02', 'Y', 'N', '', '', 'N', 'N', 'N', 'N', 'N', 'N', '', '구매팀 사무직, 3월 신규 입사'],
  ['W02', '나가상', '그 밖의 근로자', '정규·그 밖의 근로자', 'N', 'N', '2023-05-08', '2026-09-01', 'N', 'Y', '35', '35=아니오', 'Y', 'Y', 'N', 'N', 'N', 'N', '', '도장 공정으로 전환, 톨루엔(관리대상 유해물질) 상시 취급'],
  ['W03', '다가상', '그 밖의 근로자', '정규·그 밖의 근로자', 'N', 'N', '2021-02-01', '2026-10-20', 'N', 'Y', '34', '34=예', 'N', 'N', 'N', 'N', 'N', 'N', '', '저장탱크 내부 청소. 연 2회 정기보수 때만 수행'],
  ['W04', '라가상', '그 밖의 근로자', '일용', 'Y', 'N', '2026-11-02', '2026-11-02', 'Y', 'N', '26', '', 'N', 'N', 'N', 'N', 'N', 'N', '', '공장 증설공사 비계 설치. 기초안전보건교육 이수증 보유(10/15 타 기관)'],
  ['W05', '마가상', '그 밖의 근로자', '1주 초과 1개월 이하', 'N', 'N', '2026-10-28', '2026-10-28', 'Y', 'N', '', '', 'N', 'N', 'N', 'N', 'N', 'N', '', '포장 라인 3주 계약직'],
  ['W06', '바가상', '관리감독자', '정규·그 밖의 근로자', 'N', 'N', '2015-01-05', '2026-10-15', 'N', 'N', '', '', 'Y', 'N', 'N', 'N', 'Y', 'N', '', '생산팀장. 10/15 신규 세척제(MSDS 대상) 도입'],
  ['W07', '사가상', '그 밖의 근로자', '정규·그 밖의 근로자', 'N', 'N', '2019-07-01', '2026-07-01', 'N', 'Y', '14(예,아니오)', '14=아니오', 'N', 'N', 'N', 'N', 'N', 'N', '', '5톤 천장크레인 운전 배정'],
  ['W08', '아가상', '그 밖의 근로자', '정규·그 밖의 근로자', 'N', 'N', '2020-03-02', '2026-11-10', 'N', 'Y', '38', '', 'N', 'N', 'N', 'N', 'N', 'N', '소음', '설비 개조 용접(가연물 인접). 작업 빈도 미정'],
  ['W09', '자가상', '그 밖의 근로자', '정규·그 밖의 근로자', 'N', 'N', '2018-04-02', '2026-10-05', 'N', 'Y', '31(예)', '', 'N', 'N', 'N', 'N', 'N', 'N', '', '사무동 소형 온수보일러 관리(전열면적 10㎡)'],
  ['W10', '차가상', '그 밖의 근로자', '일용', 'Y', 'N', '2026-11-03', '2026-11-03', 'Y', 'N', '39', '', 'N', 'N', 'N', 'N', 'N', 'N', '', '증설공사 타워크레인 신호수']
];

var DEMO_RECORDS = [
  ['W01-채용', '2026-03-02', 8, '집체교육', '안전관리자 (가상)', '산업안전 및 사고 예방, 산업보건 및 직업병 예방 등', '참석자 서명부'],
  ['W01-정기-2026H2', '2026-09-10', 3, '인터넷 원격교육', '위탁기관 (가상)', '사무실 안전, 직무스트레스 예방', '수료증'],
  ['W02-특별35', '2026-08-31', 4, '집체교육', '보건관리자 (가상)', '톨루엔 성질·인체 영향, 국소배기장치', '참석자 서명부'],
  ['W02-특별35', '2026-09-20', 4, '현장교육', '관리감독자 (가상)', '안전작업방법 및 보호구 사용', '교육 사진'],
  ['W02-MSDS', '2026-08-31', 1, '집체교육', '보건관리자 (가상)', '톨루엔 MSDS 주요 항목', '참석자 서명부'],
  ['W02-주지-제449조', '2026-08-31', 0.5, '현장교육', '관리감독자 (가상)', '관리대상 유해물질 유해성 주지', '참석자 서명부'],
  ['W02-정기-2026H2', '2026-07-15', 6, '집체교육', '안전관리자 (가상)', '하반기 정기교육 1차', '참석자 서명부'],
  ['W02-정기-2026H2', '2026-10-14', 6, '집체교육', '안전관리자 (가상)', '하반기 정기교육 2차', '참석자 서명부'],
  ['W03-특별34', '2026-10-19', 2, '현장교육', '안전관리자 (가상)', '산소농도 측정, 비상 구출', '교육 사진'],
  ['W04-건설기초', '2026-10-15', 4, '집체교육', '외부 교육기관 (가상)', '건설업 기초안전보건교육', '수료증'],
  ['W04-특별26', '2026-11-02', 2, '현장교육', '관리감독자 (가상)', '비계 조립·해체 안전작업', '참석자 서명부'],
  ['W05-채용', '2026-10-28', 4, '집체교육', '안전관리자 (가상)', '채용 시 교육', '참석자 서명부'],
  ['W06-정기-2026', '2026-04-10', 8, '인터넷 원격교육', '위탁기관 (가상)', '관리감독자 정기교육 1차', '수료증'],
  ['W06-정기-2026', '2026-09-05', 8, '집체교육', '위탁기관 (가상)', '관리감독자 정기교육 2차', '수료증'],
  ['W07-특별14', '2026-06-30', 4, '집체교육', '안전관리자 (가상)', '크레인 방호장치, 신호방법', '참석자 서명부'],
  ['W07-특별14', '2026-08-20', 6, '현장교육', '관리감독자 (가상)', '줄걸이·인양 작업', '교육 사진'],
  ['W09-변경', '2026-10-05', 2, '현장교육', '관리감독자 (가상)', '보일러 취급 작업 변경 교육', '참석자 서명부'],
  ['W10-건설기초', '2026-11-03', 4, '집체교육', '외부 교육기관 (가상)', '건설업 기초안전보건교육', '수료증'],
  ['W10-특별39', '2026-11-03', 4, '현장교육', '관리감독자 (가상)', '신호방법 및 요령', '참석자 서명부']
];

var DEMO_EXPECTED_HEADER = ['계획ID', '이름', '교육 종류', '기대 시간', '기대 판정', '기대 상태', '정답 근거', '앱 판정', '앱 시간', '앱 상태', '결과'];

var DEMO_EXPECTED = [
  ['W01-정기-2026H2', '가상일', '정기교육', 6, '대상', '진행 중', '사무직 매반기 6시간(별표4 1가). 3시간만 이수'],
  ['W01-채용', '가상일', '채용 시 교육', 8, '대상', '완료', '그 밖의 근로자 채용 시 8시간(별표4 1나). 8시간 이수'],
  ['W02-정기-2026H2', '나가상', '정기교육', 12, '대상', '완료', '그 밖의 근로자 매반기 12시간. 6+6시간 이수'],
  ['W02-변경', '나가상', '작업내용 변경 시 교육', 2, '갈음 가능', '갈음 대기', '특별교육 실시 시 변경 시 교육 실시로 봄(시행규칙 제26조). 특별교육 미완료'],
  ['W02-특별35', '나가상', '특별교육', 16, '대상', '진행 중', '관리대상 유해물질 취급(별표5 1라 35호). 상시 작업 → 16시간. 종사 전 4시간 충족, 8/16시간, 최종기한 12/1'],
  ['W02-MSDS', '나가상', 'MSDS 교육', '-', '대상', '완료', '대상물질 취급 작업 배치(시행규칙 제169조). 법정 시간 없음. 1회 실시'],
  ['W02-주지-제449조', '나가상', '유해성 주지', '-', '대상', '완료', '관리대상 유해물질 유해성 주지(안전보건규칙 제449조)'],
  ['W03-정기-2026H2', '다가상', '정기교육', 12, '대상', '미실시', '매반기 12시간. 기한 12/31까지 57일 남음'],
  ['W03-변경', '다가상', '작업내용 변경 시 교육', 2, '갈음 가능', '완료(갈음)', '특별교육(34호) 완료로 갈음'],
  ['W03-특별34', '다가상', '특별교육', 2, '대상', '완료', '밀폐공간 작업(34호). 단기간·간헐적 작업 → 2시간(별표4 1라)'],
  ['W03-주지-제641조', '다가상', '유해성 주지', '-', '대상', '기한 경과', '밀폐공간 안전작업방법 주지(제641조). 배치일 10/20 경과, 기록 없음'],
  ['W04-정기-2026H2', '라가상', '정기교육', 12, '판단 필요', '미실시', '일용근로자의 반기 정기교육 적용은 해석 쟁점 → 판단 필요'],
  ['W04-채용', '라가상', '채용 시 교육', 1, '갈음 가능', '완료(갈음)', '일용 채용 시 1시간. 특별교육(26호) 완료로 갈음'],
  ['W04-특별26', '라가상', '특별교육', 2, '대상', '완료', '비계 작업(26호), 일용근로자 → 2시간'],
  ['W04-건설기초', '라가상', '건설업 기초안전보건교육', 4, '대상', '완료', '건설 일용근로자 4시간(법 제31조). 이수증 확인'],
  ['W05-정기-2026H2', '마가상', '정기교육', 12, '대상', '미실시', '1주 초과 1개월 이하 기간제도 정기교육 대상(그 밖의 근로자 12시간)'],
  ['W05-채용', '마가상', '채용 시 교육', 4, '대상', '완료', '1주 초과 1개월 이하 기간제 채용 시 4시간'],
  ['W06-정기-2026', '바가상', '관리감독자 정기교육', 16, '대상', '완료', '관리감독자 연간 16시간(별표4 1의2). 8+8시간'],
  ['W06-MSDS', '바가상', 'MSDS 교육', '-', '대상', '기한 경과', '신규 대상물질 도입(제169조). 10/15 도입 후 미실시'],
  ['W07-정기-2026H2', '사가상', '정기교육', 12, '대상', '미실시', '매반기 12시간'],
  ['W07-변경', '사가상', '작업내용 변경 시 교육', 2, '갈음 가능', '갈음 대기', '특별교육 미완료'],
  ['W07-특별14', '사가상', '특별교육', 16, '대상', '기한 경과', '1톤 이상 크레인(14호) 상시 → 16시간. 최종기한 10/1 경과, 10/16시간'],
  ['W08-정기-2026H2', '아가상', '정기교육', 12, '대상', '미실시', '매반기 12시간'],
  ['W08-변경', '아가상', '작업내용 변경 시 교육', 2, '갈음 가능', '갈음 대기', '특별교육 미완료'],
  ['W08-특별38', '아가상', '특별교육', 16, '판단 필요', '기한 임박', '화재위험작업(38호). 작업 빈도 미정 → 16시간 기준, 판단 필요. 종사 전 기한 11/10(6일 남음)'],
  ['W08-주지-제514조', '아가상', '유해성 주지', '-', '대상', '기한 임박', '소음수준 주지(제514조). 배치일 11/10'],
  ['W09-정기-2026H2', '자가상', '정기교육', 12, '대상', '미실시', '매반기 12시간. ※ 31호 보일러는 소형 온수보일러(14㎡ 이하) 제외 요건 → 특별교육 계획이 생기면 안 됨'],
  ['W09-변경', '자가상', '작업내용 변경 시 교육', 2, '대상', '완료', '특별교육 비대상이므로 변경 시 교육 2시간 별도 실시'],
  ['W10-정기-2026H2', '차가상', '정기교육', 12, '판단 필요', '미실시', '일용근로자 정기교육 → 판단 필요'],
  ['W10-채용', '차가상', '채용 시 교육', 1, '갈음 가능', '갈음 대기', '특별교육(39호) 미완료'],
  ['W10-특별39', '차가상', '특별교육', 8, '대상', '기한 경과', '타워크레인 신호작업, 일용 → 8시간(별표4 1라). 4/8시간, 종사 전 기한 11/3 경과'],
  ['W10-건설기초', '차가상', '건설업 기초안전보건교육', 4, '대상', '완료', '건설 일용근로자 4시간']
];

/* ===== 웹 화면 (브라우저에서만 실행, 구글 시트에서는 건너뜀) ===== */
if (typeof document !== "undefined") {
/* ===== 웹 화면 (GitHub Pages용, 빌드 도구 없이 동작) ===== */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = (s) => String(s).replace(/\s+/g, '').toLowerCase();
const todayStr = () => fmt_(new Date());

/* ───────── 저장소: 목록은 localStorage, 증빙 파일은 IndexedDB ───────── */
const KEY = { workers: 'sea.workers', records: 'sea.records', settings: 'sea.settings', logs: 'sea.logs' };
const mem = {};
function load(k, def) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return k in mem ? mem[k] : def; }
}
function save(k, v) {
  mem[k] = v;
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('저장 실패', e); }
}
const Store = {
  workers: () => load(KEY.workers, []),
  setWorkers: (v) => save(KEY.workers, v),
  records: () => load(KEY.records, []),
  setRecords: (v) => save(KEY.records, v),
  settings: () => load(KEY.settings, { base: '' }),
  setSettings: (v) => save(KEY.settings, v),
  logs: () => load(KEY.logs, []),
  setLogs: (v) => save(KEY.logs, v)
};

const FileDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('sea-evidence', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id' });
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('files', mode);
      const out = fn(t.objectStore('files'));
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  },
  put(rec) { return this.tx('readwrite', (s) => s.put(rec)); },
  get(id) { return this.tx('readonly', (s) => s.get(id)); },
  all() { return this.tx('readonly', (s) => s.getAll()); },
  clear() { return this.tx('readwrite', (s) => s.clear()); }
};

/* ───────── 공통 계산 ───────── */
const DATA = buildData(HOURS_SEED, TASKS_SEED, NOTICE_SEED);
const baseDate = () => toDate_(Store.settings().base) || toDate_(new Date());

function currentPlans() {
  const base = baseDate();
  let plans = [];
  Store.workers().forEach((w) => { plans = plans.concat(plansForWorker(DATA, w, base)); });
  const recs = Store.records().map((r) => ({ planId: r.planId, hours: r.hours, date: r.date }));
  return computeStatus(plans, recs, base);
}

const stateTag = (s) => `<span class="st" style="background:${STATE_COLORS[s] || '#fff'}">${esc(s)}</span>`;
const pct = (x) => Math.round((x || 0) * 100) + '%';
const bar = (x) => `<div class="bar"><i style="width:${pct(x)}"></i></div>`;
function badge(s) { const k = s.indexOf('판단') === 0 ? '판단' : s.indexOf('갈음') === 0 ? '갈음' : s; return `<span class="badge s-${k}">${esc(s)}</span>`; }
function table(head, rows, opts = {}) {
  return `<table${opts.fixed ? ' class="fixed"' : ''}><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
    rows.length ? rows.join('') : `<tr><td colspan="${head.length}" class="empty" style="padding:16px">${opts.empty || '자료가 없습니다.'}</td></tr>`}</tbody></table>`;
}

/* ───────── 탭 ───────── */
const RENDER = {};
function showTab(name) {
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('section.tab').forEach((s) => s.classList.toggle('on', s.id === 'tab-' + name));
  if (RENDER[name]) RENDER[name]();
  try { localStorage.setItem('sea.tab', name); } catch (e) {}
}
$('nav').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) showTab(b.dataset.tab); });

/* ═════════ 1. 교육 판정 (한 명) ═════════ */
let SELECTED = {};
let LAST = null;

TASKS_SEED.length && DATA.tasks.forEach((t) => {
  const o = document.createElement('option');
  o.value = t.no; o.textContent = t.no + '. ' + t.name;
  $('allTasks').appendChild(o);
});
const shortEmp = () => $('job').value !== 'supervisor' && ['daily', 'fixed_1w'].includes($('emp').value);
$('job').onchange = function () { $('empBox').style.display = this.value === 'supervisor' ? 'none' : ''; renderSelected(); };
$('emp').onchange = renderSelected;

function search() {
  const q = norm($('q').value);
  const box = $('cands');
  if (!q) { box.innerHTML = ''; return; }
  const hits = DATA.tasks.map((t) => {
    let score = 0;
    t.keywords.forEach((k) => { const nk = norm(k); if (nk && (q.includes(nk) || nk.includes(q))) score += 2; });
    if (norm(t.name).includes(q)) score += 1;
    return { t, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  if (!hits.length) { box.innerHTML = '<div class="hint">일치하는 작업이 없습니다. 다른 표현으로 검색하거나 목록에서 고르세요. 특별교육 대상 작업이 아닐 수도 있습니다.</div>'; return; }
  box.innerHTML = `<div class="hint">후보 ${hits.length}개 · 해당하는 작업을 모두 체크하세요</div>` + hits.map((h) =>
    `<div class="cand"><label class="chk"><input type="checkbox" data-no="${h.t.no}"${SELECTED[h.t.no] ? ' checked' : ''}> <span><b>${h.t.no}호</b> ${esc(h.t.name)}</span></label></div>`).join('');
  box.querySelectorAll('input[data-no]').forEach((el) => { el.onchange = () => toggleTask(Number(el.dataset.no), el.checked); });
}
$('searchBtn').onclick = search;
$('q').onkeydown = (e) => { if (e.key === 'Enter') search(); };
$('allTasks').onchange = function () { if (this.value) { toggleTask(Number(this.value), true); this.value = ''; } };

function toggleTask(no, on) {
  if (on) { if (!SELECTED[no]) SELECTED[no] = { answers: [], intermittent: 'unknown' }; } else delete SELECTED[no];
  renderSelected();
  $('cands').querySelectorAll(`input[data-no="${no}"]`).forEach((el) => { el.checked = on; });
}
const radios = (name, val) => '<div class="radios">' + [['yes', '예'], ['no', '아니오'], ['unknown', '모름']].map((o) =>
  `<label><input type="radio" name="${name}" value="${o[0]}"${val === o[0] ? ' checked' : ''}>${o[1]}</label>`).join('') + '</div>';

function renderSelected() {
  const box = $('selected');
  const nos = Object.keys(SELECTED).map(Number).sort((a, b) => a - b);
  if (!nos.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="hint" style="margin-top:8px">선택한 작업 ${nos.length}개</div>` + nos.map((no) => {
    const t = DATA.tasks.find((x) => x.no === no);
    const s = SELECTED[no];
    let html = `<div class="task"><div class="title"><span>${no}호 ${esc(t.name)}</span><button data-rm="${no}">삭제</button></div>`;
    if (t.exclusion) html += `<div class="hint">${esc(t.exclusion)}</div>`;
    t.questions.forEach((q, i) => { html += `<div class="q"><div class="qt">${esc(q)}</div>${radios(`q_${no}_${i}`, s.answers[i] || 'unknown')}</div>`; });
    if (!shortEmp()) html += `<div class="q"><div class="qt">단기간 또는 간헐적으로 하는 작업입니까? (예이면 특별교육 2시간)</div>${radios('i_' + no, s.intermittent)}</div>`;
    return html + '</div>';
  }).join('');
  box.querySelectorAll('button[data-rm]').forEach((b) => { b.onclick = () => toggleTask(Number(b.dataset.rm), false); });
  box.querySelectorAll('input[type=radio]').forEach((r) => {
    r.onchange = () => {
      const p = r.name.split('_');
      if (p[0] === 'q') SELECTED[Number(p[1])].answers[Number(p[2])] = r.value;
      else SELECTED[Number(p[1])].intermittent = r.value;
    };
  });
}

function collect() {
  const c = (id) => $(id).checked;
  return {
    workerName: $('workerName').value.trim(), job: $('job').value, emp: $('emp').value,
    constructionDaily: c('constructionDaily'), halfTime: c('halfTime'), newHire: c('newHire'), taskChange: c('taskChange'),
    tasks: Object.keys(SELECTED).map((no) => ({ no: Number(no), answers: SELECTED[no].answers, intermittent: SELECTED[no].intermittent })),
    sub: { msds: c('sub_msds'), managed: c('sub_managed'), permit: c('sub_permit'), special: c('sub_special'), newSubstance: c('sub_newSubstance'), msdsRevised: c('sub_msdsRevised') },
    hz: { noise: c('hz_noise'), vibration: c('hz_vibration'), dust: c('hz_dust'), pathogen: c('hz_pathogen'), msd: c('hz_msd') },
    otherLaws: c('otherLaws')
  };
}

const LAYER_NAMES = { A: 'A. 산업안전보건법 법정 교육', B: 'B. 물질안전보건자료(MSDS) 교육', C: 'C. 유해성 주지 의무 (안전보건규칙)', D: 'D. 타 법령 교육' };

$('judgeBtn').onclick = () => {
  const input = collect();
  try {
    const r = judgeCore(DATA, input);
    LAST = { input, result: r };
    renderResult(input, r);
    $('judgeMsg').textContent = '';
  } catch (e) { $('judgeMsg').innerHTML = `<span style="color:var(--red)">${esc(e.message)}</span>`; }
};

function renderResult(input, r) {
  const count = (st) => r.rows.filter((x) => x.status === st).length;
  let html = `<h2>판정 결과${input.workerName ? ' · ' + esc(input.workerName) : ''}</h2>`;
  html += `<div class="meta2">${esc(r.summary.jobLabel)}${r.summary.empLabel !== '-' ? ' · ' + esc(r.summary.empLabel) : ''} · 대상 ${count('대상')}건 · 판단 필요 ${count('판단 필요')}건 · 갈음 가능 ${count('갈음 가능')}건</div>`;
  ['A', 'B', 'C', 'D'].forEach((L) => {
    const rows = r.rows.filter((x) => x.layer === L);
    if (!rows.length) return;
    html += `<div class="layer">${LAYER_NAMES[L]}</div><div class="tbl-wrap"><table class="fixed"><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"><col class="c6"><col></colgroup><thead><tr><th>판정</th><th>교육 종류</th><th>발생 사유</th><th>법적 최소 시간</th><th>시기·주기</th><th>근거</th><th>비고</th></tr></thead><tbody>`;
    rows.forEach((x) => {
      html += `<tr><td>${badge(x.status)}</td><td>${esc(x.course)}</td><td>${esc(x.reason)}</td><td>${esc(x.hoursText)}</td><td>${esc(x.timing)}</td><td>${esc(x.basis)}<div class="lv">${esc(x.level)}</div></td><td>${esc(x.note).replace(/ \/ /g, '<br>')}${
        x.content ? `<details><summary>교육내용 보기</summary>${esc(x.content).replace(/\n/g, '<br>')}</details>` : ''}</td></tr>`;
    });
    html += '</tbody></table></div>';
  });
  if (r.notes.length) html += `<div class="notes"><b>참고</b><ul>${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
  html += '<div class="toolbar" style="margin-top:12px"><button id="logBtn">판정기록 저장</button><button id="toWorkerBtn">이 조건으로 근로자 명단에 추가</button><span class="msg" id="logMsg" style="margin:0"></span></div>';
  html += `<div class="disc">${esc(APP.disclaimer)}</div>`;
  $('result').innerHTML = html;
  $('logBtn').onclick = () => {
    const logs = Store.logs();
    logs.push({ at: new Date().toISOString(), worker: input.workerName || '(미입력)', job: r.summary.jobLabel, emp: r.summary.empLabel,
      tasks: input.tasks.map((t) => t.no + '호').join(', '),
      summary: r.rows.filter((x) => ['대상', '판단 필요'].includes(x.status)).map((x) => x.course + '(' + x.hoursText + ')' + (x.status === '판단 필요' ? '[판단 필요]' : '')).join(' / ') });
    Store.setLogs(logs);
    $('logMsg').textContent = '저장했습니다. (설정 탭의 백업에 포함)';
  };
  $('toWorkerBtn').onclick = () => openWorkerModal(null, inputToWorker(input));
}

function inputToWorker(i) {
  const JOB = { office: '사무직', sales: '판매업무 직접 종사', other: '그 밖의 근로자', supervisor: '관리감독자' };
  const EMP = { regular: '정규·그 밖의 근로자', fixed_1m: '1주 초과 1개월 이하', fixed_1w: '1주 이하', daily: '일용' };
  const KO = { yes: '예', no: '아니오', unknown: '모름' };
  const HZ = { noise: '소음', vibration: '진동', dust: '분진', pathogen: '병원체', msd: '근골격계' };
  const yn = (b) => (b ? 'Y' : 'N');
  return {
    '사번': '', '이름': i.workerName, '직무 구분': JOB[i.job], '고용 형태': EMP[i.emp],
    '건설 일용(Y/N)': yn(i.constructionDaily), '감면 사업(Y/N)': yn(i.halfTime), '채용일': '', '현 작업 배치일': '',
    '신규 채용(Y/N)': yn(i.newHire), '작업내용 변경(Y/N)': yn(i.taskChange),
    '특별교육 작업 번호': i.tasks.map((t) => t.no + (t.answers.length ? '(' + t.answers.map((a) => KO[a || 'unknown']).join(',') + ')' : '')).join(', '),
    '단기간·간헐 여부': i.tasks.filter((t) => t.intermittent !== 'unknown').map((t) => t.no + '=' + KO[t.intermittent]).join(', '),
    'MSDS 대상물질(Y/N)': yn(i.sub.msds), '관리대상 유해물질(Y/N)': yn(i.sub.managed), '허가대상 유해물질(Y/N)': yn(i.sub.permit),
    '특별관리물질(Y/N)': yn(i.sub.special), '신규 물질 도입(Y/N)': yn(i.sub.newSubstance), 'MSDS 변경(Y/N)': yn(i.sub.msdsRevised),
    '유해인자': Object.keys(i.hz).filter((k) => i.hz[k]).map((k) => HZ[k]).join(', '), '메모': ''
  };
}

/* ═════════ 2. 근로자 명단 ═════════ */
const HZ_LIST = ['소음', '진동', '분진', '병원체', '근골격계'];
$('w_hz').innerHTML = HZ_LIST.map((h) => `<label class="chk"><input type="checkbox" data-hz="${h}"> ${h}</label>`).join('');
let editingId = null;

RENDER.workers = () => {
  const ws = Store.workers();
  const plans = currentPlans();
  const rows = ws.map((w) => {
    const ps = plans.filter((p) => p.worker === String(w['사번']));
    const done = ps.filter((p) => String(p.state).indexOf('완료') === 0).length;
    return `<tr><td>${esc(w['사번'])}</td><td>${esc(w['이름'])}</td><td>${esc(w['직무 구분'])}</td><td>${esc(w['고용 형태'])}</td><td>${esc(w['채용일'])}</td><td>${esc(w['현 작업 배치일'])}</td><td>${esc(w['특별교육 작업 번호'])}</td><td>${esc(w['메모'])}</td><td class="num">${done}/${ps.length}</td>
      <td style="white-space:nowrap"><button data-edit="${esc(w['사번'])}">수정</button> <button class="danger" data-del="${esc(w['사번'])}">삭제</button></td></tr>`;
  });
  $('workerTable').innerHTML = table(['사번', '이름', '직무 구분', '고용 형태', '채용일', '배치일', '특별교육 작업', '메모', '완료/대상', ''], rows, { empty: '등록된 근로자가 없습니다. [+ 근로자 추가] 또는 시연 탭에서 가상 데이터를 넣어 보세요.' });
  $('workerTable').querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => openWorkerModal(b.dataset.edit); });
  $('workerTable').querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = () => {
      if (!confirm(`${b.dataset.del} 근로자를 명단에서 삭제할까요? 이수기록은 보존됩니다.`)) return;
      Store.setWorkers(Store.workers().filter((w) => String(w['사번']) !== b.dataset.del));
      RENDER.workers();
    };
  });
};
$('addWorker').onclick = () => openWorkerModal(null);

const W_FIELDS = { w_id: '사번', w_name: '이름', w_job: '직무 구분', w_emp: '고용 형태', w_hire: '채용일', w_assign: '현 작업 배치일', w_tasks: '특별교육 작업 번호', w_inter: '단기간·간헐 여부', w_memo: '메모' };
const W_CHECKS = { w_newHire: '신규 채용(Y/N)', w_taskChange: '작업내용 변경(Y/N)', w_const: '건설 일용(Y/N)', w_half: '감면 사업(Y/N)', w_msds: 'MSDS 대상물질(Y/N)', w_managed: '관리대상 유해물질(Y/N)', w_permit: '허가대상 유해물질(Y/N)', w_special: '특별관리물질(Y/N)', w_newSub: '신규 물질 도입(Y/N)', w_msdsRev: 'MSDS 변경(Y/N)' };

function openWorkerModal(id, preset) {
  editingId = id;
  const w = preset || (id ? Store.workers().find((x) => String(x['사번']) === id) : null) || {};
  $('wTitle').textContent = id ? '근로자 수정' : '근로자 추가';
  Object.entries(W_FIELDS).forEach(([el, k]) => { $(el).value = w[k] || (el === 'w_job' ? '그 밖의 근로자' : el === 'w_emp' ? '정규·그 밖의 근로자' : ''); });
  Object.entries(W_CHECKS).forEach(([el, k]) => { $(el).checked = yn_(w[k]); });
  const hz = String(w['유해인자'] || '').split(/[,;]/).map((s) => s.trim());
  $('w_hz').querySelectorAll('[data-hz]').forEach((c) => { c.checked = hz.includes(c.dataset.hz); });
  $('w_id').disabled = !!id;
  $('w_msg').textContent = '';
  $('wModal').classList.add('on');
}
$('w_cancel').onclick = () => $('wModal').classList.remove('on');
$('w_save').onclick = () => {
  const w = {};
  WORKER_HEADER.forEach((h) => { w[h] = ''; });
  Object.entries(W_FIELDS).forEach(([el, k]) => { w[k] = $(el).value.trim(); });
  Object.entries(W_CHECKS).forEach(([el, k]) => { w[k] = $(el).checked ? 'Y' : 'N'; });
  w['유해인자'] = [...$('w_hz').querySelectorAll('[data-hz]:checked')].map((c) => c.dataset.hz).join(', ');
  if (!w['사번']) { $('w_msg').textContent = '사번을 입력하세요.'; return; }
  if (!w['현 작업 배치일'] && !w['채용일']) { $('w_msg').textContent = '채용일 또는 배치일을 입력하세요 (기한 계산에 필요).'; return; }
  const ws = Store.workers();
  if (!editingId && ws.some((x) => String(x['사번']) === w['사번'])) { $('w_msg').textContent = '이미 있는 사번입니다.'; return; }
  const idx = ws.findIndex((x) => String(x['사번']) === (editingId || w['사번']));
  if (idx >= 0) ws[idx] = w; else ws.push(w);
  Store.setWorkers(ws);
  $('wModal').classList.remove('on');
  showTab('workers');
};

/* ═════════ 3. 교육계획 ═════════ */
const STATES = ['완료', '완료(갈음)', '진행 중', '미실시', '기한 임박', '기한 경과', '기한 경과(선행 4시간)', '갈음 대기'];
RENDER.plans = () => {
  const plans = currentPlans();
  const ws = Store.workers();
  const keepW = $('planWorker').value, keepS = $('planState').value;
  $('planWorker').innerHTML = '<option value="">전체</option>' + ws.map((w) => `<option value="${esc(w['사번'])}">${esc(w['사번'])} ${esc(w['이름'])}</option>`).join('');
  $('planState').innerHTML = '<option value="">전체</option>' + STATES.map((s) => `<option>${s}</option>`).join('');
  $('planWorker').value = keepW; $('planState').value = keepS;
  $('planBase').textContent = '기준일 ' + fmt_(baseDate()) + ' · 반기 기산은 달력 기준(확인필요목록 3번)';
  const rows = plans.filter((p) => (!keepW || p.worker === keepW) && (!keepS || p.state === keepS)).map((p) =>
    `<tr><td>${esc(p.id)}</td><td>${esc(p.name)}</td><td>${esc(p.layer)}</td><td>${esc(p.course)}</td><td>${esc(p.detail)}</td><td>${badge(p.judgment)}</td>
     <td class="num">${p.hours == null ? '-' : p.hours}</td><td>${fmt_(p.pre)}</td><td>${fmt_(p.final)}</td><td class="num">${p.done}</td><td>${bar(p.rate)}<span class="lv">${pct(p.rate)}</span></td><td>${stateTag(p.state)}</td><td>${esc(p.basis)}</td><td>${esc(p.note).replace(/ \/ /g, '<br>')}</td></tr>`);
  $('planTable').innerHTML = table(['계획ID', '이름', '층위', '교육 종류', '세부', '판정', '법정 최소시간', '선행 기한(4시간)', '최종 기한', '이수 시간', '진행률', '상태', '근거', '비고'], rows, { empty: '근로자 명단을 먼저 등록하세요.' });
};
$('planWorker').onchange = RENDER.plans;
$('planState').onchange = RENDER.plans;

/* ═════════ 4. 이수 등록 ═════════ */
RENDER.records = () => {
  const plans = currentPlans().filter((p) => String(p.state).indexOf('완료') !== 0);
  const keep = $('r_plan').value;
  $('r_plan').innerHTML = '<option value="">― 선택 ―</option>' + plans.map((p) =>
    `<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.course)} · ${esc(p.detail)} [${esc(p.state)}, ${p.done}/${p.hours == null ? '-' : p.hours}시간]</option>`).join('');
  $('r_plan').value = keep;
  if (!$('r_date').value) $('r_date').value = todayStr();
  const recs = Store.records().slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  $('recordTable').innerHTML = table(['실시일', '계획ID', '이름', '교육 종류', '교육시간', '교육방법', '강사', '교육내용', '증빙 종류', '증빙', ''], recs.map((r) =>
    `<tr><td>${esc(r.date)}</td><td>${esc(r.planId)}</td><td>${esc(r.name)}</td><td>${esc(r.course)}</td><td class="num">${esc(r.hours)}</td><td>${esc(r.method)}</td><td>${esc(r.instructor)}</td><td>${esc(r.content)}</td><td>${esc(r.evidenceType)}</td>
     <td>${r.fileId ? `<a href="#" data-file="${esc(r.fileId)}">${esc(r.fileName)}</a>` : esc(r.evidenceNote || '-')}</td><td><button class="danger" data-rdel="${esc(r.id)}">삭제</button></td></tr>`), { empty: '이수기록이 없습니다.' });
  $('recordTable').querySelectorAll('[data-file]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); openFile(a.dataset.file); }; });
  $('recordTable').querySelectorAll('[data-rdel]').forEach((b) => {
    b.onclick = () => {
      if (!confirm('이수기록은 보존 대상입니다. 정말 삭제할까요?')) return;
      Store.setRecords(Store.records().filter((r) => r.id !== b.dataset.rdel));
      RENDER.records();
    };
  });
};

async function openFile(id) {
  try {
    const f = await FileDB.get(id);
    if (!f) { alert('증빙 파일을 이 브라우저에서 찾을 수 없습니다.'); return; }
    const url = URL.createObjectURL(f.blob);
    const a = document.createElement('a');
    a.href = url; a.download = f.name; a.target = '_blank';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { alert('파일을 열 수 없습니다: ' + e.message); }
}

$('r_save').onclick = async () => {
  const msg = $('r_msg');
  const planId = $('r_plan').value;
  if (!planId) { msg.textContent = '교육계획을 선택하세요.'; return; }
  if (!$('r_date').value) { msg.textContent = '실시일을 입력하세요.'; return; }
  const plan = currentPlans().find((p) => p.id === planId);
  const rec = {
    id: 'R' + Date.now(), planId, worker: plan.worker, name: plan.name, course: plan.course,
    date: $('r_date').value, hours: Number($('r_hours').value) || 0, method: $('r_method').value,
    instructor: $('r_instructor').value.trim(), content: $('r_content').value.trim(), evidenceType: $('r_evType').value,
    createdAt: new Date().toISOString()
  };
  const file = $('r_file').files[0];
  if (file) {
    try {
      const fid = 'F' + Date.now();
      await FileDB.put({ id: fid, name: file.name, type: file.type, blob: file });
      rec.fileId = fid; rec.fileName = file.name;
    } catch (e) { msg.textContent = '증빙 파일 저장 실패: ' + e.message; return; }
  }
  const recs = Store.records(); recs.push(rec); Store.setRecords(recs);
  $('r_file').value = ''; $('r_content').value = '';
  msg.style.color = 'var(--ok)'; msg.textContent = '등록했습니다.';
  RENDER.records();
};

/* ═════════ 5. 현황판 ═════════ */
RENDER.board = () => {
  const plans = currentPlans();
  const buckets = ['완료', '진행 중', '미실시', '기한 임박', '기한 경과', '갈음 대기'];
  const bucket = (s) => (s.indexOf('완료') === 0 ? '완료' : s.indexOf('기한 경과') === 0 ? '기한 경과' : s);
  const tot = {}; buckets.forEach((b) => { tot[b] = 0; });
  plans.forEach((p) => { tot[bucket(p.state)]++; });
  const byW = [];
  plans.forEach((p) => { let g = byW.find((x) => x.id === p.worker); if (!g) { g = { id: p.worker, name: p.name, items: [] }; byW.push(g); } g.items.push(p); });
  let html = `<div class="meta2" style="margin-bottom:8px">기준일 ${fmt_(baseDate())} · ${esc(APP.disclaimer)}</div>`;
  html += `<div class="cards"><div class="card">대상 교육<b>${plans.length}</b></div>` + buckets.map((b) =>
    `<div class="card" style="background:${STATE_COLORS[b] || '#fff'}">${b}<b>${tot[b]}</b></div>`).join('') +
    `<div class="card">이수율<b>${plans.length ? pct(tot['완료'] / plans.length) : '-'}</b></div></div>`;
  const rows = byW.map((g) => {
    const c = {}; buckets.forEach((b) => { c[b] = 0; });
    g.items.forEach((p) => { c[bucket(p.state)]++; });
    const pend = g.items.filter((p) => p.judgment === '판단 필요').length;
    const rate = c['완료'] / g.items.length;
    return `<tr><td>${esc(g.id)}</td><td>${esc(g.name)}</td><td class="num">${g.items.length}</td>${buckets.map((b) =>
      `<td class="num" style="background:${c[b] && (b === '기한 경과' || b === '기한 임박') ? STATE_COLORS[b] : ''}">${c[b]}</td>`).join('')}<td class="num">${pend}</td><td>${bar(rate)}<span class="lv">${pct(rate)}</span></td></tr>`;
  });
  html += '<h2>근로자별 현황</h2><div class="tbl-wrap">' + table(['사번', '이름', '대상 교육'].concat(buckets).concat(['판단 필요', '이수율']), rows, { empty: '근로자 명단을 먼저 등록하세요.' }) + '</div>';
  const urgent = plans.filter((p) => /기한 경과|기한 임박/.test(p.state));
  html += '<h2>조치가 필요한 교육 (기한 경과·임박)</h2><div class="tbl-wrap">' + table(['계획ID', '이름', '교육 종류', '세부', '선행 기한(4시간)', '최종 기한', '이수', '상태'], urgent.map((p) =>
    `<tr><td>${esc(p.id)}</td><td>${esc(p.name)}</td><td>${esc(p.course)}</td><td>${esc(p.detail)}</td><td>${fmt_(p.pre)}</td><td>${fmt_(p.final)}</td><td class="num">${p.done}/${p.hours == null ? '-' : p.hours}</td><td>${stateTag(p.state)}</td></tr>`), { empty: '없음' }) + '</div>';
  $('boardView').innerHTML = html;
};

/* ═════════ 6. 이수확인서 ═════════ */
RENDER.cert = () => {
  const ws = Store.workers();
  const keep = $('certWorker').value;
  $('certWorker').innerHTML = ws.map((w) => `<option value="${esc(w['사번'])}">${esc(w['사번'])} ${esc(w['이름'])}</option>`).join('');
  if (keep && ws.some((w) => String(w['사번']) === keep)) $('certWorker').value = keep;
  const id = $('certWorker').value;
  if (!id) { $('certView').innerHTML = '<div class="empty">근로자 명단을 먼저 등록하세요.</div>'; return; }
  const w = ws.find((x) => String(x['사번']) === id);
  const plans = currentPlans().filter((p) => p.worker === id);
  const recs = Store.records().filter((r) => r.worker === id).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  $('certView').innerHTML = `<div class="cert"><h3>안전보건교육 이수 확인서</h3>
    <table style="max-width:420px"><tbody><tr><th>사번</th><td>${esc(id)}</td></tr><tr><th>성명</th><td>${esc(w['이름'])}</td></tr><tr><th>직무·고용</th><td>${esc(w['직무 구분'])} · ${esc(w['고용 형태'])}</td></tr><tr><th>기준일</th><td>${fmt_(baseDate())}</td></tr></tbody></table>
    <h2>1. 대상 교육 및 이수 현황</h2>` + table(['교육 종류', '세부', '판정', '법정 최소시간', '이수 시간', '진행률', '상태', '근거'], plans.map((p) =>
      `<tr><td>${esc(p.course)}</td><td>${esc(p.detail)}</td><td>${esc(p.judgment)}</td><td class="num">${p.hours == null ? '-' : p.hours}</td><td class="num">${p.done}</td><td>${pct(p.rate)}</td><td>${stateTag(p.state)}</td><td>${esc(p.basis)}</td></tr>`)) +
    '<h2>2. 교육 실시 기록 및 증빙</h2>' + table(['교육 종류', '실시일', '교육시간', '교육방법', '강사', '교육내용', '증빙'], recs.map((r) =>
      `<tr><td>${esc(r.course)}</td><td>${esc(r.date)}</td><td class="num">${esc(r.hours)}</td><td>${esc(r.method)}</td><td>${esc(r.instructor)}</td><td>${esc(r.content)}</td><td>${esc(r.evidenceType)}${r.fileName ? ' (' + esc(r.fileName) + ')' : r.evidenceNote ? ' (' + esc(r.evidenceNote) + ')' : ''}</td></tr>`), { empty: '기록 없음' }) +
    `<p style="margin-top:24px">확인자: ____________________ (서명)</p><div class="disc">${esc(APP.disclaimer)}</div></div>`;
};
$('certWorker').onchange = RENDER.cert;
$('certPrint').onclick = () => {
  const sec = $('tab-cert');
  sec.classList.add('print');
  window.print();
  setTimeout(() => sec.classList.remove('print'), 500);
};

/* ═════════ 7. 시연 ═════════ */
RENDER.demo = () => {
  if (!$('demoView').innerHTML) $('demoView').innerHTML = '<div class="hint">① 버튼으로 가상 데이터를 넣은 뒤, 근로자 명단·교육계획·현황판 탭을 둘러보세요. ② 버튼은 법령을 근거로 미리 정한 정답표와 앱 결과를 비교합니다.</div>';
};
$('demoLoad').onclick = () => {
  if (Store.workers().length && !confirm('지금 있는 근로자 명단과 이수기록을 가상 데이터로 바꿉니다. 계속할까요?')) return;
  const ws = DEMO_WORKERS.map((r) => { const w = {}; WORKER_HEADER.forEach((h, i) => { w[h] = r[i]; }); return w; });
  const names = {}; ws.forEach((w) => { names[w['사번']] = w['이름']; });
  const COURSE = { '채용': '채용 시 교육', '변경': '작업내용 변경 시 교육', '건설기초': '건설업 기초안전보건교육', 'MSDS': '물질안전보건자료(MSDS) 교육', '정기': '정기교육', '주지': '유해성 주지' };
  const recs = DEMO_RECORDS.map((r, i) => {
    const [wid, kind] = r[0].split('-');
    return { id: 'DEMO-' + (i + 1), planId: r[0], worker: wid, name: names[wid], course: COURSE[kind] || (kind.indexOf('특별') === 0 ? '특별교육' : kind),
      date: r[1], hours: r[2], method: r[3], instructor: r[4], content: r[5], evidenceType: r[6], evidenceNote: '시연용 가상 증빙', createdAt: new Date().toISOString() };
  });
  Store.setWorkers(ws); Store.setRecords(recs);
  const s = Store.settings(); s.base = DEMO_BASE; Store.setSettings(s);
  $('demoView').innerHTML = `<div class="notes">가상 근로자 ${ws.length}명, 이수기록 ${recs.length}건을 넣고 기준일을 ${DEMO_BASE}로 설정했습니다. 근로자 명단·교육계획·현황판 탭을 확인하거나 ② 정답표 대조를 누르세요.</div>`;
  updateMeta();
};
$('demoVerify').onclick = () => {
  if (!Store.workers().length) { alert('먼저 ① 시연용 가상 데이터를 넣으세요.'); return; }
  const rows = compareExpected(DEMO_EXPECTED, currentPlans());
  const ok = rows.filter((r) => r[10] === '일치').length;
  $('demoView').innerHTML = `<div class="cards"><div class="card">대조 건수<b>${rows.length}</b></div><div class="card ok">일치<b>${ok}</b></div><div class="card ${ok < rows.length ? 'bad' : ''}">불일치<b>${rows.length - ok}</b></div></div>
    <div class="meta2">기준일 ${fmt_(baseDate())} · 정답표는 법령(별표 4·5 등)을 근거로 미리 정한 기대값입니다.</div><div class="tbl-wrap">` +
    table(DEMO_EXPECTED_HEADER, rows.map((r) => `<tr>${r.map((v, i) => `<td${i === 10 ? ` class="${v === '일치' ? 'ok' : 'bad'}"` : ''}>${esc(v)}</td>`).join('')}</tr>`)) + '</div>';
};

/* ═════════ 8. 법령 데이터 ═════════ */
RENDER.law = () => {
  const v = $('lawSel').value;
  const map = { hours: [HOURS_HEADER, HOURS_SEED], tasks: [TASKS_HEADER, TASKS_SEED], notice: [NOTICE_HEADER, NOTICE_SEED], rules: [RULES_HEADER, RULES_SEED], issues: [ISSUES_HEADER, ISSUES_SEED] };
  const [h, rows] = map[v];
  $('lawView').innerHTML = `<div class="meta2">법령 기준: ${esc(APP.lawBasis)} · 데이터 작성일 ${esc(APP.compiledOn)}</div>` +
    table(h, rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c).replace(/\n/g, '<br>')}</td>`).join('')}</tr>`));
};
$('lawSel').onchange = RENDER.law;

/* ═════════ 9. 설정 ═════════ */
RENDER.settings = () => { $('s_base').value = Store.settings().base || ''; };
$('s_base').onchange = () => { const s = Store.settings(); s.base = $('s_base').value; Store.setSettings(s); updateMeta(); $('s_msg').textContent = '기준일을 저장했습니다.'; };
$('s_today').onclick = () => { $('s_base').value = ''; $('s_base').onchange(); };

const blobToB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
const b64ToBlob = (b64, type) => { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type }); };

$('s_export').onclick = async () => {
  const out = { app: 'safety-edu', version: APP.version, exportedAt: new Date().toISOString(), workers: Store.workers(), records: Store.records(), settings: Store.settings(), logs: Store.logs(), files: [] };
  if ($('s_withFiles').checked) {
    try { for (const f of await FileDB.all()) out.files.push({ id: f.id, name: f.name, type: f.type, b64: await blobToB64(f.blob) }); } catch (e) { console.warn(e); }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
  a.download = `안전교육_백업_${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  $('s_msg').textContent = '백업 파일을 내려받았습니다. 개인정보가 들어 있으니 안전한 곳에 보관하세요.';
};
$('s_importBtn').onclick = () => $('s_import').click();
$('s_import').onchange = async () => {
  const f = $('s_import').files[0];
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (d.app !== 'safety-edu') throw new Error('이 앱의 백업 파일이 아닙니다.');
    if (!confirm('현재 데이터를 백업 파일 내용으로 바꿉니다. 계속할까요?')) return;
    Store.setWorkers(d.workers || []); Store.setRecords(d.records || []); Store.setSettings(d.settings || { base: '' }); Store.setLogs(d.logs || []);
    for (const x of d.files || []) await FileDB.put({ id: x.id, name: x.name, type: x.type, blob: b64ToBlob(x.b64, x.type) });
    $('s_msg').textContent = '백업을 불러왔습니다.';
    updateMeta(); RENDER.settings();
  } catch (e) { $('s_msg').textContent = '불러오기 실패: ' + e.message; }
  $('s_import').value = '';
};
$('s_reset').onclick = async () => {
  if (!confirm('모든 근로자·이수기록·판정기록·증빙 파일을 이 브라우저에서 삭제합니다. 되돌릴 수 없습니다. 계속할까요?')) return;
  Store.setWorkers([]); Store.setRecords([]); Store.setLogs([]); Store.setSettings({ base: '' });
  try { await FileDB.clear(); } catch (e) {}
  $('s_msg').textContent = '삭제했습니다.';
  updateMeta(); RENDER.settings();
};

/* ───────── 시작 ───────── */
function updateMeta() {
  $('metaLine').textContent = `v${APP.version} · 법령 기준: ${APP.lawBasis} · 기준일 ${fmt_(baseDate())}`;
}
$('footer').textContent = APP.disclaimer + ' 모든 데이터는 이 브라우저에만 저장됩니다.';
updateMeta();
let startTab = 'judge';
try { startTab = localStorage.getItem('sea.tab') || 'judge'; } catch (e) {}
showTab(document.getElementById('tab-' + startTab) ? startTab : 'judge');

}
