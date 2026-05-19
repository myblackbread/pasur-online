'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  const handleGoToProfile = () => {
    router.push('/profile');
  };

  return (
    <div>
      <h1>Главная страница</h1>
      <button onClick={handleGoToProfile}>
        Перейти в профиль
      </button>
    </div>
  );
}