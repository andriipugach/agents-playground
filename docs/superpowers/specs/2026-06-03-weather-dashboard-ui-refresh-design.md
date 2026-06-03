# Weather Dashboard UI Refresh Design

## Objective

Modernize the Weather Dashboard user experience with a vibrant, friendly interface using Base UI components only for interactive UI controls. Keep existing API behavior and user flows intact, while improving visual hierarchy and adding lightweight weather insights charts.

## Constraints and Decisions

- Use `@base-ui/react` components for interactive UI controls and accessibility primitives.
- Keep current data contracts and API endpoints unchanged:
  - `GET /api/weather?city=...`
  - `GET /api/favorites`
  - `POST /api/favorites`
  - `DELETE /api/favorites/:id`
- Preserve existing core behavior:
  - search by city
  - show current weather and 3-day forecast
  - add, load, and remove favorites
  - user-friendly error state rendering
- Visual direction: **vibrant-modern, premium**.
- Charts: use a **popular free React charting library (Recharts)** for the 3-day forecast visualizations.
- Layout: **hero + responsive two-column dashboard** (main weather/forecast column + favorites side panel; stacks on mobile).
- Weather icons: render OpenWeatherMap condition icons from the existing `iconUrl` fields on current conditions and each forecast day.

## Proposed Experience

### 1) Hero Search Section

- A large, welcoming hero panel with gradient background and concise heading.
- Search form built with Base UI:
  - `Field.Root`
  - `Field.Label`
  - `Input`
  - `Button`
- Include supportive microcopy to guide first action (search city).

### 2) Current Conditions Card

- Elevated weather card for selected city/country.
- Display:
  - condition icon
  - condition text
  - temperature (primary metric)
  - humidity
  - wind speed
- Add primary call-to-action button (`Add to favorites`) with Base UI `Button`.
- Visual layout emphasizes temperature and city context first.

### 3) Forecast Insights Card (Recharts)

- Render a temperature trend chart for the 3-day forecast using **Recharts** (gradient area + line, responsive container).
- Render per-day forecast cards, each showing the day's weather icon, condition text, and temperature.
- Keep explicit textual daily forecast values for readability and accessibility.
- Wrap the chart region in a labeled container (`aria-label="3-day temperature trend"`) so tests assert on the region deterministically rather than chart internals.
- In tests, mock Recharts `ResponsiveContainer` with a fixed-size wrapper to keep output pristine (jsdom has zero layout dimensions).

### 4) Favorites Card

- Render favorites in a scrollable panel using Base UI `ScrollArea`.
- Preserve actions:
  - `Load` triggers `onSearch(city)`
  - `Remove` triggers `onRemoveFavorite(id)`
- Action hierarchy:
  - `Load` as a clear secondary action
  - `Remove` as subdued destructive action

## Layout Architecture

Use a hero header followed by a responsive two-column dashboard grid in `WeatherDashboard`:

1. Hero search (full width)
2. Error banner (when present, full width)
3. Two-column grid (single column on mobile):
   - **Main column:** current conditions card (or empty-state card) + forecast insights card (shown when weather exists)
   - **Side column:** favorites card

### Why this layout

- Dashboard-style two-column layout reads as more premium on desktop.
- Collapses to a single column on narrow screens for mobile usability.
- Keeps the primary search-to-result workflow prominent while favorites stay accessible.

## Component Boundaries

### `WeatherDashboardContainer` (existing)

- Continues handling:
  - fetching weather and favorites
  - maintaining `weather`, `favorites`, and `error` state
  - passing callbacks and state to presentational component
- Optional extension: expose lightweight request-pending state for button loading visuals (if needed for improved UX).

### `WeatherDashboard` (rewritten)

- Focused on display and user interaction wiring.
- Uses Base UI primitives and semantic sections.
- Owns local search input state and submit handling.

### Internal Presentation Helpers

Within `WeatherDashboard`, extract small pure helpers to keep file legible:

- trend-point mapper from forecast values
- inline SVG path builder for temperature line
- small formatter helpers (units, display labels)

No cross-module API changes required.

## Styling Plan (`app/globals.css`)

- Introduce a modern design token section:
  - accent colors
  - gradients
  - card backgrounds
  - shadows
  - radii
- Replace legacy utility class names (`panel`, `search-row`) with clearer BEM-like names scoped to dashboard sections.
- Keep responsive breakpoints simple and mobile-first.
- Ensure contrast and focus visibility remain strong for accessibility.

## Error, Empty, and Loading States

- Error: prominent inline banner with `role="alert"` retained.
- Empty weather: clear invitation card encouraging first search.
- Loading affordances:
  - disable submit button during search (if pending state is added)
  - optional subtle “loading” label in hero actions area
- Favorites empty state remains explicit and friendly.

## Testing Strategy (TDD-first)

Update `tests/weather-dashboard.test.tsx` before implementation changes:

1. Adjust queries for new UI semantics and labels.
2. Add assertions for:
   - hero search submission behavior
   - current conditions content rendering
   - forecast insights section visibility
   - lightweight chart presence with accessible label
   - favorites load/remove actions still firing callbacks
3. Keep callback behavior tests deterministic and focused on user-visible outcomes.

Then implement minimal production changes required for passing tests.

## Files to Change

- `components/weather-dashboard.tsx` (primary rewrite)
- `components/weather-dashboard-container.tsx` (minimal state adjustments only if needed)
- `app/globals.css` (visual refresh)
- `tests/weather-dashboard.test.tsx` (updated tests first)
- `README.md` (short UI update note at end of implementation, per user request)

## Risks and Mitigations

- **Risk:** Base UI API mismatch with current usage patterns.  
  **Mitigation:** Use documented component parts (`Field`, `Input`, `Button`, `ScrollArea`, `Meter`/`Progress`) and validate with TypeScript.

- **Risk:** Fancy styles reduce readability.  
  **Mitigation:** Keep typography and spacing conservative; apply color in containers/accents, not body text.

- **Risk:** Chart harms accessibility.  
  **Mitigation:** Provide textual forecast list and ARIA-friendly labels for chart container.

## Out of Scope

- New backend endpoints or data model changes.
- Expanded forecast horizon beyond 3 days.
- Persisting additional user preferences.

## Acceptance Criteria

- Dashboard uses Base UI components for interactive controls.
- UI has a vibrant-modern appearance with improved hierarchy.
- Compact forecast chart is visible and understandable.
- Existing weather and favorites behaviors continue working.
- Tests are updated and pass with deterministic outcomes.
- README includes a brief note about the refreshed UI and charted insights.
