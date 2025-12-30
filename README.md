<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1KOJ2K94Loef2BViv0tMyS4VL0v1cZDdh

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. 환경 변수 설정:
   - `.env.example` 파일을 참고하여 `.env` 파일을 생성하세요
   - Firebase 프로젝트 설정에서 다음 값들을 가져와서 설정하세요:
     ```env
     VITE_FIREBASE_API_KEY=your_api_key_here
     VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
     VITE_FIREBASE_PROJECT_ID=your_project_id_here
     VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
     VITE_FIREBASE_APP_ID=your_app_id_here
     ```

3. Run the app:
   ```bash
   npm run dev
   ```

## 프로젝트 구조

```
web-sticky-notes/
├── components/          # React 컴포넌트
│   ├── icons/          # 아이콘 컴포넌트
│   └── ...
├── hooks/              # 커스텀 훅
│   ├── useDrag.ts      # 드래그 앤 드롭 로직
│   └── useFirestoreNotes.ts  # Firebase 데이터 관리
├── utils/              # 유틸리티 함수
│   ├── dateUtils.ts    # 날짜 관련 유틸리티
│   ├── domUtils.ts     # DOM 조작 유틸리티
│   └── constants.ts    # 상수 정의
├── firebaseConfig.ts   # Firebase 설정
└── types.ts           # TypeScript 타입 정의
```

## 주요 개선사항

- ✅ **보안**: Firebase 설정을 환경 변수로 이동
- ✅ **코드 구조**: 드래그 로직을 커스텀 훅으로 분리
- ✅ **유틸리티**: 공통 함수를 utils 폴더로 분리
- ✅ **에러 처리**: Firebase 에러 처리 및 로딩 상태 관리 추가
- ✅ **타입 안정성**: TypeScript 타입 정의 강화
