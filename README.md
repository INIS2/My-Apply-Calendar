# My Apply Calendar

여러 회사 지원 현황과 공고, 마감, 발표, 면접 일정을 리스트와 달력으로 관리하는 작은 정적 웹앱입니다.

## 현재 상태

- GitHub Pages에 바로 올릴 수 있는 정적 앱입니다.
- 현재 데이터는 브라우저 `localStorage`에 저장됩니다.
- 현재 상태는 사용자가 직접 입력하지 않고, 오늘 날짜와 일정 진행도 기준으로 자동 계산됩니다.
- `docs/supabase-schema.sql`에 Supabase용 테이블과 RLS 정책 초안을 넣어두었습니다.

## GitHub Pages + Supabase 메모

GitHub Pages 저장소가 public이어도 Supabase `anon key`는 프론트에 노출되는 것이 정상입니다. 중요한 것은 `service_role key`를 절대 프론트에 넣지 않는 것과, Supabase에서 RLS를 켜고 `auth.uid() = user_id` 정책으로 자기 데이터만 보이게 막는 것입니다.

무료로 가려면 다음 구성이 현실적입니다.

1. GitHub Pages public repository
2. Supabase free project
3. Supabase Auth 사용
4. `anon public key`만 프론트 코드에 포함
5. 모든 테이블 RLS 활성화

## 다음 구현 후보

- Supabase Auth 로그인 화면
- `localStorage` 저장소를 Supabase CRUD로 교체
- 일정 체크 전용 빠른 패널
- 모바일 달력 주간 보기
