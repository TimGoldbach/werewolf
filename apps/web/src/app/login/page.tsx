import { SiteFooter } from '@/components/site-footer'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col p-4">
      <div className="flex flex-1 items-center justify-center">
        <LoginForm />
      </div>
      <SiteFooter className="pb-0" />
    </div>
  )
}
