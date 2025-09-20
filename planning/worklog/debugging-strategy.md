# Debugging and Testing Strategy
## Session: September 18, 2025

### Current Status
- **Environment**: Windows development with WSL container for Claude access
- **Issue**: Package manager conflicts between Windows npm installation and WSL environment
- **Solution**: All testing must be done in Windows, results captured and fed back to Claude

### Testing Commands for Windows (User to Run)

#### 1. Development Server Test
```cmd
cd C:\Users\edkjo\theSpruceForgeDevelopment\projects\active\landingsside-energi-react
yarn dev
```
**Expected**: Server starts on http://localhost:3000
**Log Location**: Terminal output
**What to capture**: Any errors, startup time, port number

#### 2. Landing Page User Journey Test
```cmd
# After npm run dev succeeds
# Open browser: http://localhost:3000
```
**Test Steps**:
1. Verify landing page loads with Norwegian text
2. Test address search with "Karl Johans gate 1, Oslo"
3. Verify dropdown appears with addresses
4. Select an address
5. Click "Start Analyse" button
6. Verify navigation to dashboard with address parameter

**What to capture**:
- Screenshots of each step
- Any console errors (F12 Developer Tools)
- Network requests in DevTools
- Performance metrics if available

#### 3. Dashboard Progressive Disclosure Test
```cmd
# After navigating to dashboard
# URL should be: http://localhost:3000/dashboard?address=...
```
**Test Steps**:
1. Verify mock data warning banner is visible
2. Test progressive disclosure sections:
   - Click "Vis detaljer" on Bygningsinformasjon
   - Click "Vis detaljer" on Energiytelse
   - Click "Vis detaljer" on Investeringsanalyse
3. Verify tooltips work on energy terms
4. Test action buttons (should show as clickable but not functional yet)

**What to capture**:
- Screenshots of expanded/collapsed states
- Any animation glitches
- Console errors
- Responsiveness on mobile size (F12 responsive mode)

#### 4. Build Test
```cmd
yarn build
```
**Expected**: Clean build with no TypeScript errors
**What to capture**: Build time, bundle sizes, any warnings/errors

#### 5. Lint and Type Check
```cmd
yarn lint
yarn type-check
```
**Expected**: No errors
**What to capture**: Any linting or type errors

### Output Format for Claude
Please provide results in this format:

```
## Test Results - [Date/Time]

### Environment
- Node.js version: [run: node --version]
- Yarn version: [run: yarn --version]
- Windows version: [run: winver]

### Development Server
- Status: [SUCCESS/FAILED]
- Startup time: [X seconds]
- URL: [http://localhost:3000]
- Console output: [paste relevant output]
- Screenshots: [describe what you see]

### Landing Page Journey
- Page load: [SUCCESS/FAILED]
- Address search: [SUCCESS/FAILED]
- Dropdown interaction: [SUCCESS/FAILED]
- Navigation to dashboard: [SUCCESS/FAILED]
- Issues found: [list any problems]

### Dashboard Progressive Disclosure
- Mock data warning: [VISIBLE/HIDDEN]
- Progressive disclosure: [WORKING/BROKEN]
- Tooltips: [WORKING/BROKEN]
- Mobile responsiveness: [GOOD/ISSUES]
- Issues found: [list any problems]

### Build and Quality
- Build status: [SUCCESS/FAILED]
- Lint status: [CLEAN/ERRORS]
- Type check: [CLEAN/ERRORS]
- Bundle size: [if available]

### Screenshots/Files to Share
[List any screenshots or log files created]
```

### Debugging Strategy

#### For Errors
1. **Capture full error stack trace**
2. **Note exact steps to reproduce**
3. **Check browser DevTools console**
4. **Verify which component/file is causing issue**

#### For Performance Issues
1. **Use Chrome DevTools Performance tab**
2. **Check Network tab for slow requests**
3. **Note bundle sizes in build output**

#### For UX Issues
1. **Screenshot before/after states**
2. **Test on different screen sizes**
3. **Verify accessibility (tab navigation)**

### Claude's Role
- **NO testing in WSL/container**
- **Analyze provided results**
- **Suggest fixes based on Windows environment**
- **Create specific commands for user to run**
- **Update code based on test results**

### File Locations for Logs
- **Session logs**: `worklog/sessionlog_[timestamp].md`
- **Test results**: `worklog/test-results-[timestamp].md`
- **Screenshots**: `worklog/screenshots/` (if created)
- **Debug output**: `worklog/debug-[timestamp].txt`

### Next Steps
1. User runs Windows testing commands
2. User provides results in specified format
3. Claude analyzes and suggests fixes
4. Repeat until UX journey is confirmed working
5. Document final working state for future sessions