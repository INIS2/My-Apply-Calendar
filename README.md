# My Apply Calendar

여러 회사 지원 현황과 공고, 마감, 발표, 면접 일정을 리스트와 달력으로 함께 관리하는 정적 웹앱입니다.

## Access
https://inis2.github.io/My-Apply-Calendar/

PWA and Supabase connection test build.

## 현재 상태

- GitHub Pages에 바로 올릴 수 있는 정적 앱입니다.
- 데스크톱에서는 지원 카드 리스트와 월간 달력을 함께 보는 대시보드로 동작합니다.
- 모바일에서는 하단 탭으로 대시보드, 달력, 마이페이지를 전환합니다.
- 지원 카드를 누르면 회사 정보, 우선순위, 메모, 전형 단계를 관리하는 상세 화면으로 이동합니다.
- 현재 데이터는 브라우저 `localStorage`에 저장됩니다.
- 지원 상태와 진행률은 일정 날짜, 완료 여부, 결과 값을 기준으로 자동 계산됩니다.

## 문서와 데이터 방향

- `docs/design.md`에 Modern Blue 기반의 전문 SaaS 디자인 시스템을 정리했습니다.
- `docs/supabase-schema.sql`은 Supabase Auth와 연결되는 `users`, `applies`, `apply_stages` 기반의 DB DDL V3 초안입니다.
- 전형 단계는 3단 분류(`nth_type`, `step_type`, `state_type`), 메모, 시작/종료 기간, 날짜 미정 값을 저장할 수 있습니다.

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
