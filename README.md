# MathMagica Combat Simulator

PvE TCG 보드게임 MathMagica의 전투 시뮬레이터 웹 프로토타입입니다.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Zustand (상태 관리)

## 실행

```bash
npm install
npm run dev
```

## 기능

### Campaign Editor
- 플레이어 덱 구성 (원소/룬/마도구 카드)
- 장비 구성 (모자/로브/손/장신구)
- 몬스터 대기열 구성
- 캠페인 코드 내보내기/불러오기
- 튜토리얼 프리셋

### Battle Simulator
- 수식 기반 마법 시스템
- 마법열 카드 배치 및 시전
- 몬스터 소울 파괴 / 공격 방어
- 키워드 효과 (보호막, 면역, 취약, 저주 등)
- 멀티 플레이어 순서 결정
