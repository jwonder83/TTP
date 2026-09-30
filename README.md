# IRON LOG

모바일 운동 기록 앱입니다. 운동, 루틴, 기록은 Supabase에 저장되고, 진행 중인 운동은 이 기기에도 잠시 백업됩니다.

## Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. Project Settings → API에서 Project URL을 복사합니다.
3. 같은 화면에서 `anon` `public` 키를 복사합니다. `service_role` 키는 브라우저나 클라이언트에 넣지 않습니다.
4. 프로젝트 루트에 `.env.local` 파일을 만듭니다. 예시는 `.env.local.example`입니다. 비밀 값은 커밋하지 않습니다.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Supabase Dashboard → SQL Editor에서 마이그레이션을 번호 순서대로 실행합니다. 이미 적용된 파일은 다시 실행하지 않습니다.
   - `001_initial_schema.sql`부터 `009_training_recommendations.sql`
   - PHASE 4: `010_training_programs.sql`, `011_program_days.sql`, `012_program_exercises.sql`, `013_workout_notes.sql`, `014_offline_sync_support.sql`, `015_indexes.sql`
6. Authentication → URL Configuration
   - Site URL: 배포 주소. 현재 프로덕션은 `https://ttp-blond-five.vercel.app`
   - Redirect URLs: `https://ttp-blond-five.vercel.app/**` 와 로컬 개발이면 `http://localhost:3000/**`
7. Authentication → Providers → Email. 이메일 확인이 켜져 있으면 가입 메일의 링크가 Site URL로 돌아갑니다. 비밀번호 최소 길이는 8입니다.
8. 기본 운동 목록은 `003_seed_exercises.sql`에 있습니다. RLS는 모든 사용자 데이터 테이블에서 켜 둡니다.

## 프로덕션

Vercel 프로젝트에 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 넣습니다. 이 값은 빌드 시점에 들어갑니다. `service_role`은 Vercel에도 넣지 않습니다.

PWA 아이콘 교체 위치:

- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon-maskable-512.png`
- `public/icons/apple-touch-icon.png`

현재 파일은 자리표시자입니다. Service Worker는 `public/sw.js`이고 캐시 이름은 앱 버전 `0.4.0`을 따릅니다.

앱이 꺼진 동안의 운동 알림은 푸시 서버가 없어 이번 버전에서 지원하지 않습니다. 휴식 타이머 알림은 페이지가 열려 있고 권한을 허용한 브라우저에서만 동작합니다. JSON 가져오기와 로그인 계정 자체 삭제는 다음 단계입니다. 계정 데이터 삭제는 로그인한 사용자의 권한으로만 지우고, 인증 사용자는 남습니다.

```
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 로그인하지 않은 사용자는 `/login`으로 이동합니다.

## 로컬 데이터

이전 버전의 `forge.v1` 기록이 이 브라우저에 있으면 로그인 후 Import 또는 Skip을 선택할 수 있습니다. 데모용 시드 데이터만 있으면 묻지 않습니다. 가져온 운동은 새 UUID로 저장됩니다.
