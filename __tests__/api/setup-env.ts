// Runs before every API test file: point the routes at the docker test DB
process.env.DATABASE_URL = 'postgres://postgres:postgres@db.localtest.me:5432/main'
process.env.NEON_LOCAL_PROXY = 'http://127.0.0.1:4444/sql'
process.env.ADMIN_TOKEN = 'test-admin-token'
process.env.ADMIN_PASSWORD = 'test-password'
