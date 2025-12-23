# Asset Correlation Lab

금융 자산 간의 상관관계를 시각화하고 분석하는 SPA 웹 애플리케이션입니다.

## 주요 기능

- **Correlation Matrix**: 6개 자산(SPY, QQQ, GLD, BTCUSD, TLT, DXY)의 상관관계 히트맵
- **Comparative Chart**: 선택한 2개 자산의 누적 수익률 비교 (기준 100)
- **Insights**: 상관계수 기반 자동 분석 결과 (최고 양의 상관, 최강 음의 상관, 0에 가까운 상관)

## 기술 스택

### Frontend
- HTML5 + Vanilla JS (ES Modules)
- CSS (다크 터미널 테마)
- Chart.js (CDN)

### Backend
- Python FastAPI
- Pandas, NumPy
- 로컬 CSV 데이터

## 설치 및 실행

### 1. 의존성 설치

```bash
pip install -r requirements.txt
```

### 2. 서버 실행

```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 브라우저에서 접속

```
http://localhost:8000
```

## API 엔드포인트

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/assets` | GET | 자산 목록 조회 |
| `/api/correlation-matrix?range=1Y` | GET | 상관관계 매트릭스 조회 |
| `/api/comparison?asset_a=SPY&asset_b=QQQ&range=1Y` | GET | 2개 자산 비교 데이터 |
| `/api/insights?range=1Y` | GET | 분석 인사이트 조회 |

### Range 옵션
- `1M`: 최근 1개월
- `3M`: 최근 3개월
- `6M`: 최근 6개월
- `YTD`: 연초부터 현재까지
- `1Y`: 최근 1년
- `3Y`: 최근 3년
- `5Y`: 최근 5년
- `10Y`: 최근 10년
- `MAX`: 전체 기간 (약 20년)

## 프로젝트 구조

```
Correlation/
├── backend/
│   ├── main.py          # FastAPI 서버
│   └── data/            # CSV 데이터 파일
│       ├── SPY.csv
│       ├── QQQ.csv
│       ├── GLD.csv
│       ├── BTCUSD.csv
│       ├── TLT.csv
│       └── DXY.csv
├── frontend/
│   ├── index.html       # 메인 HTML
│   ├── style.css        # 스타일시트
│   └── app.js           # 프론트엔드 로직
├── requirements.txt     # Python 의존성
├── SPEC.md          # 프로젝트 명세서
└── README.md
```

## 데이터 계산 방식

- **수익률**: 로그 수익률 `r_t = ln(P_t / P_{t-1})`
- **상관계수**: 피어슨 상관계수 (날짜 교집합 기준)
- **누적 수익률**: `index_t = index_{t-1} * exp(r_t)` (기준 100)

## 면책 조항

⚠️ 이 도구는 정보 제공 목적으로만 사용되며 금융 조언을 구성하지 않습니다. 과거 성과가 미래 결과를 보장하지 않습니다.

