import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from '../../store/useToastStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      // Backend doesn't expect confirmPassword
      const { confirmPassword, ...submitData } = data;
      const response = await authApi.register(submitData);
      
      if (response.success && response.data?.user) {
        setAuth(response.data.user);
        toast.success('Account created successfully!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          setError(err.field as any, { message: err.message });
        });
      } else {
        toast.error(error.message || 'Failed to register');
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-dark-text">
          Create your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md bg-surface p-8 rounded-xl shadow-sm border border-taupe-border">
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Full name"
            type="text"
            autoComplete="name"
            {...register('name')}
            error={errors.name?.message}
          />

          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            error={errors.password?.message}
          />

          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Create account
          </Button>
        </form>

        <p className="mt-10 text-center text-sm text-muted-text">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold leading-6 text-primary-button hover:text-primary-hover transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
