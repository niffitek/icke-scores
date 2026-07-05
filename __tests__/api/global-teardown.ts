import { execSync } from 'child_process'

export default (): void => {
  execSync('docker compose -f docker-compose.test.yml down', { stdio: 'inherit' })
}
