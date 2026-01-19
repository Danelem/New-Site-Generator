# Vercel Deployment Troubleshooting

## Issue: `ERR_MODULE_NOT_FOUND` for `@google/generative-ai`

If you're getting this error in Vercel:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@google/generative-ai'
```

### Solution Steps

1. **Verify package.json includes the dependency**
   - Check that `@google/generative-ai` is in `dependencies` (not `devDependencies`)
   - Current version should be `^0.24.1` or higher

2. **Ensure package-lock.json is committed**
   ```bash
   git add package-lock.json
   git commit -m "Add package-lock.json"
   git push
   ```
   This ensures Vercel uses the exact same dependency versions.

3. **Check Vercel Build Logs**
   - Go to your Vercel project dashboard
   - Check the "Build Logs" for the deployment
   - Look for `npm install` output
   - Verify that `@google/generative-ai` is being installed

4. **Verify Environment Variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Ensure `GOOGLE_AI_API_KEY` is set for Production, Preview, and Development
   - Redeploy after adding environment variables

5. **Clear Vercel Build Cache**
   - In Vercel dashboard, go to Settings → General
   - Scroll to "Build & Development Settings"
   - Click "Clear Build Cache"
   - Redeploy

6. **Check Node.js Version**
   - Ensure Vercel is using Node.js 18.x or higher
   - In Vercel dashboard: Settings → General → Node.js Version
   - Should be set to `18.x` or `20.x`

7. **Force Rebuild**
   - In Vercel dashboard, go to Deployments
   - Click the three dots on the latest deployment
   - Select "Redeploy"
   - This will trigger a fresh build

### If Issue Persists

1. **Check Vercel Function Logs**
   - Go to your deployment in Vercel
   - Click on "Functions" tab
   - Check the logs for the specific API route that's failing
   - Look for any import errors or module resolution issues

2. **Verify Import Paths**
   - All imports should use the wrapper: `@/lib/generator/googleAI`
   - Not direct: `@google/generative-ai`
   - This ensures the package is properly bundled

3. **Check Build Output**
   - In Vercel build logs, look for:
     - `Creating an optimized production build`
     - `Compiled successfully`
   - If build fails, fix those errors first

4. **Contact Vercel Support**
   - If the issue persists after trying all steps
   - Provide them with:
     - Build logs
     - Function logs
     - package.json
     - next.config.js

### Prevention

- Always commit `package-lock.json`
- Use static imports (not dynamic imports) for serverless functions
- Test builds locally before deploying: `npm run build`
- Monitor Vercel build logs for warnings
