### FastAPI 관련 명령어 Cheatsheet

FastAPI 앱을 실행하는 주요 방법은 **Uvicorn** (직접 실행)과 **FastAPI CLI** (`fastapi` 명령어)입니다.  
FastAPI 최신 버전(0.111+ 이상, `pip install "fastapi[standard]"`로 설치 시)에서 **FastAPI CLI**가 기본 포함되어 더 간편하게 사용할 수 있어요.

#### 1. FastAPI CLI 명령어 (권장: 더 간단하고 자동 감지)
FastAPI CLI는 `main.py`나 `app.py` 파일에서 `app` 인스턴스를 자동으로 찾아 실행합니다.

| 명령어                  | 설명                                      | 예시                          | 비고 |
|-------------------------|-------------------------------------------|-------------------------------|------|
| `fastapi dev [file.py]` | 개발 모드: 자동 재로드(--reload) 포함     | `fastapi dev main.py`<br>`fastapi dev backend/main.py` | 기본 포트 8000, localhost<br>파일 지정 안 하면 자동 검색 |
| `fastapi run [file.py]` | 프로덕션 모드: 재로드 없이 실행           | `fastapi run main.py`        | 외부 접근 시 `--host 0.0.0.0` 추가 가능 |
| `fastapi --help`        | 모든 옵션 확인                            | -                             | 호스트, 포트 등 Uvicorn 옵션 대부분 전달 가능 |

#### 2. Uvicorn 직접 실행 (전통적/세밀한 제어)
`module:app` 형식으로 지정 (예: `backend.main:app` → backend/main.py 파일의 app 변수)

| 명령어                                      | 설명                                      | 예시                                      |
|---------------------------------------------|-------------------------------------------|-------------------------------------------|
| `uvicorn module:app --reload`               | 개발 모드 (자동 재로드)                   | `uvicorn backend.main:app --reload`      |
| `uvicorn module:app`                        | 프로덕션 모드 (기본)                      | `uvicorn backend.main:app`               |
| `uvicorn module:app --host 0.0.0.0 --port 8000` | 호스트/포트 지정 (외부 접근 허용)        | `uvicorn backend.main:app --host 0.0.0.0` |
| `uvicorn module:app --workers 4`             | 멀티 워커 (프로덕션, CPU 코어 수 만큼)    | `uvicorn backend.main:app --workers 4`   | --reload와 함께 사용 불가 |
| `uvicorn module:app --log-level info`       | 로그 레벨 설정 (debug, info 등)           | -                                         |
| `uvicorn module:app --reload-dir ./src`     | 특정 디렉토리만 감시 (재로드 효율화)      | -                                         |
| `uvicorn --help`                            | 모든 옵션 확인                            | -                                         |

#### 3. 코드 내에서 실행 (스크립트로 직접 실행할 때)
`main.py` 파일 끝에 추가:

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
```

→ `python backend/main.py`로 실행

#### 4. 프로덕션 배포 팁
- 단독 Uvicorn: 개발/테스트용
- 멀티 워커: Gunicorn + UvicornWorker 사용
  ```bash
  gunicorn -k uvicorn.workers.UvicornWorker -w 4 backend.main:app
  ```
- Docker/K8s: 단일 프로세스 권장, --workers 대신 컨테이너 스케일링

#### 접근 URL (실행 후)
- API 문서: `http://127.0.0.1:8000/docs` (Swagger UI)
- 대안 문서: `http://127.0.0.1:8000/redoc`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

이 cheatsheet로 대부분의 상황 커버될 거예요! 더 구체적인 옵션이 필요하면 `fastapi --help`나 `uvicorn --help` 실행해보세요. 😊