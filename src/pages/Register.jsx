import { Navigate } from 'react-router-dom';
import RegisterForm from '@/components/auth/RegisterForm';
import PageTransition from '@/components/layout/PageTransition';
import { useAuthStore } from '@/store/authStore';
import { useSeo } from '@/hooks/useSeo';

export default function Register() {
  useSeo('Create Account', 'Create an account for faster checkout, order tracking and saved favourites.');
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) return <Navigate to={user?.isVerified ? '/dashboard' : '/verify-email'} replace />;

  return (
    <PageTransition>
      <div className="min-h-screen flex pt-20 md:pt-24">
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 md:px-12 py-12">
          <div className="w-full max-w-md">
            <RegisterForm />
          </div>
        </div>
        <div className="hidden lg:flex w-1/2 bg-caviar-100 dark:bg-caviar-900 items-center justify-center">
          <span className="font-serif text-8xl text-caviar-200 dark:text-caviar-700">CB</span>
        </div>
      </div>
    </PageTransition>
  );
}
