import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from '../../store/useToastStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  
  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const response = await authApi.login(data);
      if (response.success && response.data?.user) {
        setAuth(response.data.user);
        toast.success('Welcome back!');
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          setError(err.field as any, { message: err.message });
        });
      } else {
        toast.error(error.message || 'Failed to login');
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-dark-text">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm bg-surface p-8 rounded-xl shadow-sm border border-taupe-border">
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-dark-text">
                Password
              </label>
              <div className="text-sm">
                <Link to="/forgot-password" className="font-semibold text-primary-button hover:text-primary-hover transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>
            <Input
              type="password"
              autoComplete="current-password"
              {...register('password')}
              error={errors.password?.message}
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Sign in
          </Button>
        </form>

        <p className="mt-10 text-center text-sm text-muted-text">
          Not a member?{' '}
          <Link to="/register" className="font-semibold leading-6 text-primary-button hover:text-primary-hover transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};
