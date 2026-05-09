import { redirect } from 'next/navigation'

// SMS links point here — redirect to the pricing section on the landing page
export default function UpgradePage() {
  redirect('/#pricing')
}
