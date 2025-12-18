
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { signUp, signIn } from './actions';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export const signUpSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter no mínimo 6 caracteres.' }),
});

export const signInSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(1, { message: 'A senha é obrigatória.' }),
});

type SignUpForm = z.infer<typeof signUpSchema>;
type SignInForm = z.infer<typeof signInSchema>;

export default function AuthPage() {
  const [authType, setAuthType] = useState<'signin' | 'signup'>('signin');
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);


  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '' },
  });

  const [isSignInLoading, setIsSignInLoading] = useState(false);
  const [isSignUpLoading, setIsSignUpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (data: SignInForm) => {
    setIsSignInLoading(true);
    const result = await signIn(data);
    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Erro no Login',
        description: result.error,
      });
    } else {
      toast({
        title: 'Login bem-sucedido!',
        description: 'Redirecionando...',
      });
      // O useEffect cuidará do redirecionamento
    }
    setIsSignInLoading(false);
  };

  const handleSignUp = async (data: SignUpForm) => {
    setIsSignUpLoading(true);
    const result = await signUp(data);
    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Erro no Cadastro',
        description: result.error,
      });
    } else {
      toast({
        title: 'Cadastro realizado com sucesso!',
        description: 'Faça login para continuar.',
      });
      setAuthType('signin');
      signUpForm.reset();
    }
    setIsSignUpLoading(false);
  };
  
  const formVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  // Mostra a tela de carregamento enquanto o estado de auth é verificado
  // ou se o usuário já está logado e aguardando redirecionamento.
  if (loading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 font-body">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Bem-vindo!</CardTitle>
          <CardDescription>Acesse sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex justify-center gap-2 rounded-lg bg-muted p-1">
            <Button
              variant={authType === 'signin' ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => setAuthType('signin')}
            >
              <LogIn className="mr-2 h-4 w-4" /> Entrar
            </Button>
            <Button
              variant={authType === 'signup' ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => setAuthType('signup')}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Criar Conta
            </Button>
          </div>
          <AnimatePresence mode="wait">
            {authType === 'signin' ? (
              <motion.form
                key="signin"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
                onSubmit={signInForm.handleSubmit(handleSignIn)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" placeholder="seu@email.com" {...signInForm.register('email')} />
                  {signInForm.formState.errors.email && <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Senha</Label>
                  <div className="relative">
                    <Input id="signin-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...signInForm.register('password')} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {signInForm.formState.errors.password && <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isSignInLoading}>
                  {isSignInLoading ? <Loader2 className="animate-spin" /> : 'Entrar'}
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
                onSubmit={signUpForm.handleSubmit(handleSignUp)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="seu@email.com" {...signUpForm.register('email')} />
                   {signUpForm.formState.errors.email && <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                   <div className="relative">
                    <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="Crie uma senha forte" {...signUpForm.register('password')} />
                     <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                   {signUpForm.formState.errors.password && <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isSignUpLoading}>
                  {isSignUpLoading ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </CardContent>
        <CardFooter className='text-xs text-muted-foreground justify-center'>
            <p>Ao continuar, você concorda com nossos Termos.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
