# Session Workflow Guide
## Systematic Approach to Planning and Development Sessions

**Created**: September 18, 2025
**Purpose**: Ensure consistent, organized approach to all development sessions

## Pre-Session Preparation (5 minutes)

### 1. Check Active Tasks
```bash
# Read current todos
cat worklog/todos_master.md

# Check latest session log
ls -la worklog/sessionlog_* | tail -1
```

### 2. Review Context Documents
- **Service Definition**: `planning/service-definition/core-service-definition.md`
- **UX Research**: `planning/ux-research/ux-design-principles.md`
- **Current User Journey**: `planning/user-journey/` (if exists)
- **PRD**: `PRD.md` (for core requirements)

### 3. Identify Session Focus
- **What type of work?** (UX, Implementation, Research, Planning)
- **What specific outcome?** (Clear deliverable goal)
- **What planning docs need updates?** (Based on session type)

## During Session Workflow

### 1. Session Initialization
```bash
# Create session log
touch worklog/sessionlog_YYYYMMDD_topic.md

# Start with session objective and context
```

### 2. Real-Time Documentation Strategy

#### For UX/Research Sessions
- **Update**: `planning/ux-research/` with new findings
- **Track**: User journey insights in `planning/user-journey/`
- **Document**: Service clarifications in `planning/service-definition/`

#### For Implementation Sessions
- **Update**: `worklog/todos_master.md` with progress
- **Track**: Technical decisions and rationale
- **Document**: Any PRD amendments in `planning/prd-amendments/`

#### For Planning Sessions
- **Create**: Forward-looking plans in `planning/session-plans/`
- **Update**: Master todo list with new priorities
- **Track**: Strategic decisions and reasoning

### 3. Decision Documentation
For any significant decision:
```markdown
## Decision: [Brief Title]
- **Context**: Why this decision was needed
- **Options Considered**: What alternatives were evaluated
- **Decision**: What was chosen and why
- **Impact**: How this affects user journey/implementation
- **Cross-Reference**: Related planning docs to update
```

### 4. Todo Management
- **Use TodoWrite tool** for immediate task tracking during session
- **Update master list** with session-specific todos
- **Mark completions** as work is finished
- **Add follow-up tasks** discovered during implementation

## Post-Session Completion (10 minutes)

### 1. Session Log Finalization
```markdown
# Session Log Template
## Session Objective
[What was the goal]

## Work Completed
- [Specific accomplishments]
- [Files created/modified]
- [Decisions made]

## Planning Documents Updated
- [List specific files changed]
- [Cross-references to related docs]

## Todo List Changes
- [Completed items]
- [New items added]
- [Priority changes]

## Next Session Priorities
- [High priority follow-up tasks]
- [Blockers or dependencies]
- [Context for next session]
```

### 2. Master Todo List Sync
```bash
# Update todos_master.md with session results
# Mark completed items
# Add new items discovered
# Update priorities based on session outcomes
```

### 3. Cross-Reference Updates
- **Link session log** to affected planning docs
- **Update planning doc headers** with "Last Updated" dates
- **Note decision impacts** in relevant docs
- **Update CLAUDE.md** if new processes/rules discovered

### 4. Cleanup and Organization
```bash
# Ensure all new files are in correct locations
# Move any misplaced research to planning folders
# Update any cross-references between documents
```

## Session Types and Focus Areas

### UX Research Sessions
- **Primary Docs**: `planning/ux-research/`
- **Secondary**: `planning/user-journey/`
- **Output**: Design principles, user insights, journey improvements

### Implementation Sessions
- **Primary Docs**: Session logs, todo tracking
- **Secondary**: Technical decision documentation
- **Output**: Working code, feature completion, bug fixes

### Planning/Strategy Sessions
- **Primary Docs**: `planning/session-plans/`, `planning/prd-amendments/`
- **Secondary**: Service definition updates
- **Output**: Strategic direction, process improvements, project plans

### Service Definition Sessions
- **Primary Docs**: `planning/service-definition/`
- **Secondary**: User journey implications
- **Output**: Clarified service scope, user journey updates

## Quality Checkpoints

### Information Architecture Health
- [ ] All research saved in appropriate planning folders
- [ ] Session logs cross-reference related planning docs
- [ ] Master todo list reflects current session priorities
- [ ] No orphaned documents or duplicated information

### Continuity Assurance
- [ ] Next session priorities clearly documented
- [ ] Context preserved for future sessions
- [ ] Decision rationale captured for reference
- [ ] Planning docs updated with session insights

### CLAUDE.md Compliance
- [ ] Session management rules followed
- [ ] Version control applied where needed
- [ ] Todo lists maintained in session notes AND master list
- [ ] Plans from plan mode documented in session logs

## Common Patterns by Session Outcome

### Research Discovery Sessions
```
Pre: Review existing research → During: Investigate + document → Post: Update knowledge base
```

### Feature Implementation Sessions
```
Pre: Check todos + context → During: Build + test + document → Post: Update progress + next steps
```

### UX Analysis Sessions
```
Pre: Review user journey + service definition → During: Analyze + identify improvements → Post: Update UX research + planning docs
```

### Service Clarification Sessions
```
Pre: Review current service definition → During: Clarify scope + implications → Post: Update service definition + user journey
```

---

*This workflow guide should be referenced at the start of each session and updated when process improvements are discovered.*