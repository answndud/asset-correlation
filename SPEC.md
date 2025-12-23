# request.md — Asset Correlation Lab (MVP)

## 0) 역할(Role)
당신은 금융 데이터 시각화에 능숙한 시니어 프론트엔드 개발자이자 UI/UX 디자이너입니다.  

---

## 1) 프로젝트 목표(Goal)
여러 자산(예: S&P500, 나스닥100, 금, 비트코인, 미국 장기국채, 달러 인덱스)의 **상관관계(returns 기준)**를 비교하고,
특정 2개 자산을 선택해 **기간별 누적 수익률(기준 100)**을 겹쳐 보면서 해석할 수 있는  
단일 페이지(SPA) 웹사이트를 구현합니다.

---

## 2) 범위 축소(MVP 고정) — 반드시 준수
이 프로젝트는 “간단한 프로젝트”이므로 아래를 강제합니다.

### (1) 차트 라이브러리 고정
- **Recharts 사용 금지**
- **Chart.js만 사용 (CDN 로드)**

### (2) 3D/고급 애니메이션 제외
- **Three.js 사용 금지**
- **GSAP/ScrollTrigger 사용 금지**
- 애니메이션은 CSS transition 및 최소한의 requestAnimationFrame만 사용

### (3) 인사이트 생성 규칙 고정
- “달러 강세로 금 하락” 같은 외부 거시 해석/문장 **금지**
- 인사이트는 **현재 선택된 기간의 상관계수/표본수/변동성(returns std)** 등 **계산 결과만 기반**으로 자동 생성

---

## 3) 기술 스택(Tech Stack)

### Frontend (가볍게)
- HTML5 + Vanilla JS (ES Modules 허용)
- CSS (Tailwind 사용 금지)
- Chart.js (CDN)
- Correlation Heatmap: HTML/CSS Grid(권장) 또는 Canvas(둘 중 더 단순한 방식 선택)

### Backend
- Python FastAPI
- 데이터 소스: **로컬 CSV fixtures로 고정**
  - 외부 데이터 API/yfinance 사용하지 않음(배포 실패/레이트리밋/심볼 문제 방지)
- 간단 캐시(메모리 dict + TTL) 가능하나, CSV 기반이라 필수는 아님

---

## 4) 데이터 정의 & 계산 규칙(정확성 핵심)

### (1) 입력 데이터 형식(고정)
- `backend/data/` 아래에 CSV 파일을 둔다.
- 파일명 예시:
  - `SPY.csv`, `QQQ.csv`, `GLD.csv`, `BTCUSD.csv`, `TLT.csv`, `DXY.csv`
- CSV 컬럼(필수):
  - `date` (YYYY-MM-DD)
  - `close` (float)

### (2) 수익률 계산
- 기본은 **로그 수익률**:
  - `r_t = ln(P_t / P_{t-1})`
- 모든 계산은 returns 기준으로 수행한다(가격 직접 상관 금지).

### (3) 기간(range)
- 프론트에서 선택 가능한 기간: `1M`, `6M`, `1Y`, `YTD`
- 기간 필터링 기준:
  - `YTD`: 해당 연도 1월 1일(또는 첫 거래일)부터
  - 나머지: 오늘 기준 역산(월/연) 후 해당 기간 데이터만 사용
  - (단, fixtures 데이터가 “오늘”을 포함하지 않을 수 있으므로 백엔드는 **데이터의 마지막 날짜를 기준**으로 range를 계산해도 됨. 그 경우 프론트에 “마지막 데이터 기준일”을 내려줘 표기한다.)

### (4) 상관계수
- **피어슨 상관계수**(Pearson)
- 두 자산 returns는 **날짜 교집합으로 정렬** 후 계산
- 각 pair별로 `sample_count`(정렬 후 유효 표본수)도 함께 제공

### (5) 비교 차트용 시계열
- 누적 수익률 지수(기준 100):
  - `index_0 = 100`
  - `index_t = index_{t-1} * exp(r_t)` (로그수익률 기준)
- Asset A/B 각각을 동일 날짜 축으로 정렬해 표시(교집합 기준)

---

## 5) UI/UX 요구사항

### (1) 테마(CSS 변수)
- 다크 터미널 톤, CSS 변수로 관리:
  - bg: `#0d1117`
  - panel: `rgba(255,255,255,0.06)`
  - border: `rgba(255,255,255,0.10)`
  - text: `#e6edf3`
  - muted: `rgba(230,237,243,0.65)`
  - pos: `#2ecc71`
  - neg: `#e74c3c`
  - accent: `#4aa3ff`

### (2) 페이지 구조 (단일 페이지)
1) Hero
- 타이틀: `Asset Correlation Lab`
- 서브텍스트: 상관관계가 의미하는 바를 한 문장으로(정의 + 유의점 1개)
- CTA 버튼: `Start Analysis` → 매트릭스 섹션으로 스크롤

2) Correlation Matrix (핵심)
- 기본 자산 6개를 로드하여 히트맵 표시
- 색상 스케일:
  - -1 ~ +1 값을 pos/neg 색으로 매핑, 0 근처는 중립
- Hover:
  - 툴팁 표시: `A vs B`, corr(소수 3자리), sample_count
- Click:
  - 클릭한 셀이 Asset A/B로 설정되고 비교 차트가 갱신됨

3) Comparative Chart
- Chart.js 라인 차트 1개
- 컨트롤:
  - Asset A selector
  - Asset B selector
  - Range selector (1M/6M/1Y/YTD)
- 표기:
  - 기준일(백엔드가 선택한 마지막 데이터 날짜)
  - 정렬 후 표본수(교집합 days)

4) Insights (3개 카드)
- “계산 기반” 자동 생성 문장 3개
- 예시(문장 스타일 참고, 문구는 계산 결과로 구성):
  - “선택 기간에서 가장 높은 양(+)의 상관: QQQ–SPY (0.912, n=124)”
  - “선택 기간에서 가장 강한 음(-)의 상관: DXY–GLD (-0.421, n=124)”
  - “상관이 거의 0에 가까운 조합: TLT–BTCUSD (0.03, n=120)”
- 외부 원인/거시 해석 문장 금지

5) Footer
- 데이터 출처: `Local CSV fixtures (demo)`
- 면책 문구: informational only

### (3) 반응형 & 접근성
- 모바일:
  - 매트릭스는 가로 스크롤 가능 컨테이너 + 헤더 고정(가능하면)
  - 또는 작은 화면에서는 pair 리스트 모드로 자동 전환(더 단순한 방식 선택)
- `prefers-reduced-motion` 설정 존중(애니메이션 최소화/비활성)

---

## 6) API 명세(FastAPI)

### GET /api/assets
응답 예시:
```json
[
  {"id":"SPY","name":"S&P 500 (SPY)"},
  {"id":"QQQ","name":"Nasdaq 100 (QQQ)"},
  {"id":"GLD","name":"Gold (GLD)"},
  {"id":"BTCUSD","name":"Bitcoin (BTC-USD)"},
  {"id":"TLT","name":"US 20Y+ Treasury (TLT)"},
  {"id":"DXY","name":"US Dollar Index (DXY)"}
]