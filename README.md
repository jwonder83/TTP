# IRON LOG

모바일 운동 기록 앱입니다. 운동, 루틴, 기록은 Supabase에 저장되고, 진행 중인 운동은 이 기기에도 잠시 백업됩니다.

## Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. Project Settings → API에서 Project URL을 복사합니다.
3. 같은 화면에서 `anon` `public` 키를 복사합니다. `service_role` 키는 사용하지 않습니다.
4. 프로젝트 루트에 `.env.local` 파일을 만듭니다.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Supabase Dashboard → SQL Editor에서 아래 파일을 순서대로 실행합니다.
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls.sql`
   - `supabase/migrations/003_seed_exercises.sql`
   - `supabase/migrations/004_profile_trigger.sql`
6. Authentication → Providers → Email에서 테스트용으로 Confirm email을 끄면 가입 직후 바로 로그인됩니다. 비밀번호 최소 길이는 8로 맞춥니다.
7. 의존성을 설치하고 개발 서버를 실행합니다.

```
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 로그인하지 않은 사용자는 `/login`으로 이동합니다.

## 로컬 데이터

이전 버전의 `forge.v1` 기록이 이 브라우저에 있으면 로그인 후 Import 또는 Skip을 선택할 수 있습니다. 데모용 시드 데이터만 있으면 묻지 않습니다. 가져온 운동은 새 UUID로 저장됩니다.
