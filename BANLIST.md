# 관리자 전화번호 벤리스트

관리자 화면의 **벤리스트** 탭에서 휴대폰 번호를 등록하거나 차단 해제한다. 번호는 숫자로 통일해 `bannedPhones/{phone}`에 별도로 저장한다. 기존 예약 문서를 이동·수정·삭제하지 않는다.

접수 화면에서 차단 여부를 먼저 확인하고, Firestore에서도 신규 예약 생성 시 같은 번호를 확인한다. 하이픈·공백·국가번호 표기가 달라도 같은 번호로 처리한다. 차단된 번호에는 예약 저장과 접수 알림을 실행하지 않는다. 차단 해제 후 다시 접수할 수 있다.

## 운영 규칙 보존

`firestore.rules.before-banlist`는 작업 직전 운영 규칙 원본이다. 기존 `users` 권한과 예약 조회·목록·집계·수정·삭제의 관리자 조건은 유지한다. 기존의 포괄적인 생성 허용 조건이 번호 차단을 우회하지 않도록, 신규 예약 생성과 새 `bannedPhones` 경로에만 조건을 추가했다. 기존 스키마에 대한 추가 검증은 도입하지 않았다.

목록 조회·번호 등록·차단 해제는 기존 관리자 역할로 제한한다. 접수 화면에서는 입력한 번호의 차단 여부만 조회할 수 있으며, 해당 문서에는 번호와 등록 시각만 저장한다.

## 검증

화면 및 발송 회귀 테스트:

```powershell
$env:CI='true'
node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand
```

운영 데이터에 접근하지 않는 로컬 규칙 테스트:

```powershell
firebase emulators:exec --only firestore --project demo-clean-banlist --config firebase.test.json 'node --test tests/firestore-banlist.test.cjs'
```

원본과 변경 규칙의 기존 권한 17가지를 비교하며, 관리자 전용 차단 관리, 표기별 신규 접수 거부, 차단 해제, 기존 예약 보존을 검증한다. 운영 DB에는 시험 예약이나 시험 차단 번호를 쓰지 않는다.

## 배포

규칙을 먼저 배포한 뒤 프런트엔드를 배포한다.

```powershell
firebase deploy --only firestore:rules --project clothing-app-5fe84
```

프런트엔드는 기존 GitHub Pages 배포 절차를 사용한다. 운영 규칙 원본과 배포 전후 ruleset 식별자는 작업 폴더에 별도 백업한다.
