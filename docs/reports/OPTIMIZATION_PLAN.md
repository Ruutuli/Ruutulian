# Website Performance Optimization Plan

## Problem Statement
Navigation between pages is very slow. This plan addresses performance bottlenecks and implements optimizations to improve page load times and navigation speed.

---

## 🔍 Identified Issues

### 1. **Navigation Component Performance**
- **Issue**: `Navigation` component is a server component that reads cookies on every page render
- **Impact**: Adds latency to every page load
- **Location**: `src/components/layout/Navigation.tsx`

### 2. **No Link Prefetching**
- **Issue**: Next.js Links don't have prefetch enabled, so pages aren't preloaded on hover
- **Impact**: Users wait for full page load on every navigation
- **Location**: All Link components throughout the app

### 3. **No Caching/Revalidation Strategy**
- **Issue**: Pages have no route segment config for caching or revalidation
- **Impact**: Every navigation triggers a full server-side render and database query
- **Location**: All page components

### 4. **Inefficient Home Page Data Fetching**
- **Issue**: Home page fetches ALL worlds and OCs from database just to get 2-3 random items
- **Impact**: Unnecessary database load and slow initial page load
- **Location**: `src/app/(public)/page.tsx`

### 5. **Sequential Database Queries**
- **Issue**: Some pages make sequential queries that could be parallelized
- **Impact**: Slower page loads
- **Location**: Multiple pages (worlds/[slug], ocs/[slug], etc.)

### 6. **No Static Generation**
- **Issue**: All pages are server-rendered on demand
- **Impact**: No caching benefits, slower response times
- **Location**: All page components

### 7. **Large Component Bundles**
- **Issue**: OC detail page is extremely large (1600+ lines)
- **Impact**: Larger JavaScript bundles, slower hydration
- **Location**: `src/app/(public)/ocs/[slug]/page.tsx`

### 8. **Middleware Overhead**
- **Issue**: Middleware runs on every request, including static assets
- **Impact**: Unnecessary processing
- **Location**: `middleware.ts`

---

## ✅ Optimization Strategy

### Phase 1: Quick Wins (High Impact, Low Effort)

#### 1.1 Enable Link Prefetching
- **Action**: Add `prefetch={true}` to all Next.js Link components
- **Expected Impact**: 30-50% faster perceived navigation
- **Files**: All files with Link components
- **Priority**: HIGH

#### 1.2 Add Route Segment Config for Caching
- **Action**: Add `export const revalidate = 60` to public pages
- **Expected Impact**: 40-60% reduction in database queries
- **Files**: All public page components
- **Priority**: HIGH

#### 1.3 Optimize Navigation Component
- **Action**: Convert to client component with cached session check, or use React cache
- **Expected Impact**: 20-30% faster page loads
- **Files**: `src/components/layout/Navigation.tsx`
- **Priority**: HIGH

#### 1.4 Optimize Home Page Data Fetching
- **Action**: Use database-level random selection (ORDER BY RANDOM() LIMIT) instead of fetching all
- **Expected Impact**: 70-90% reduction in data transfer and query time
- **Files**: `src/app/(public)/page.tsx`
- **Priority**: HIGH

### Phase 2: Database & Query Optimization

#### 2.1 Parallelize Database Queries
- **Action**: Use Promise.all() for independent queries
- **Expected Impact**: 30-50% faster page loads
- **Files**: `src/app/(public)/worlds/[slug]/page.tsx`, `src/app/(public)/ocs/[slug]/page.tsx`
- **Priority**: MEDIUM

#### 2.2 Optimize Query Selects
- **Action**: Only select fields that are actually used
- **Expected Impact**: 20-40% reduction in data transfer
- **Files**: All pages with database queries
- **Priority**: MEDIUM

#### 2.3 Add Database Indexes
- **Action**: Ensure indexes exist on frequently queried fields (slug, is_public, world_id)
- **Expected Impact**: 50-80% faster queries
- **Priority**: MEDIUM (requires database access)

### Phase 3: Code Splitting & Bundle Optimization

#### 3.1 Split Large Components
- **Action**: Break down OC detail page into smaller components
- **Expected Impact**: Faster initial load, better code splitting
- **Files**: `src/app/(public)/ocs/[slug]/page.tsx`
- **Priority**: MEDIUM

#### 3.2 Lazy Load Heavy Components
- **Action**: Use dynamic imports for heavy components (gallery, markdown renderers)
- **Expected Impact**: 20-30% faster initial page load
- **Priority**: LOW

### Phase 4: Advanced Optimizations

#### 4.1 Implement ISR (Incremental Static Regeneration)
- **Action**: Use `generateStaticParams` with ISR for detail pages
- **Expected Impact**: Near-instant page loads for cached pages
- **Files**: Detail pages (worlds/[slug], ocs/[slug], etc.)
- **Priority**: MEDIUM

#### 4.2 Optimize Middleware
- **Action**: Exclude more static paths, cache session checks
- **Expected Impact**: 10-20% faster request processing
- **Files**: `middleware.ts`
- **Priority**: LOW

#### 4.3 Add Response Caching Headers
- **Action**: Set appropriate cache headers for static content
- **Expected Impact**: Better browser caching
- **Files**: `next.config.js`, middleware
- **Priority**: LOW

---

## 📋 Implementation Checklist

### Immediate (Phase 1)
- [ ] Enable prefetching on all Link components
- [ ] Add revalidate config to all public pages
- [ ] Optimize Navigation component (client component or React cache)
- [ ] Fix home page random selection query

### Short-term (Phase 2)
- [ ] Parallelize database queries in detail pages
- [ ] Optimize query selects (only needed fields)
- [ ] Review and optimize database indexes

### Medium-term (Phase 3)
- [ ] Split large components
- [ ] Implement lazy loading for heavy components

### Long-term (Phase 4)
- [ ] Implement ISR for detail pages
- [ ] Optimize middleware matcher
- [ ] Add response caching headers

---

## 📊 Expected Results

### Before Optimization
- Average page load: 2-4 seconds
- Navigation delay: 1-3 seconds
- Database queries per page: 3-8 queries
- Bundle size: Large (due to monolithic components)

### After Optimization
- Average page load: 0.5-1.5 seconds (60-75% improvement)
- Navigation delay: 0.2-0.5 seconds (80-90% improvement)
- Database queries per page: 1-3 queries (60-70% reduction)
- Bundle size: Optimized with code splitting

---

## 🎯 Success Metrics

Track these metrics to measure improvement:
1. **Time to First Byte (TTFB)**: Target < 200ms
2. **First Contentful Paint (FCP)**: Target < 1s
3. **Largest Contentful Paint (LCP)**: Target < 2.5s
4. **Time to Interactive (TTI)**: Target < 3s
5. **Navigation click to page ready**: Target < 500ms

---

## 🔧 Technical Notes

### Prefetching Strategy
- Enable prefetching for all internal links
- Consider prefetching on hover for main navigation links
- Disable prefetching for admin routes (dynamic content)

### Caching Strategy
- Public pages: 60 seconds revalidation
- Detail pages: 300 seconds revalidation
- Admin pages: No caching (always fresh)

### Database Optimization
- Use Supabase's query optimization features
- Consider implementing a Redis cache layer for frequently accessed data
- Use database connection pooling

---

## 🚀 Next Steps

1. Review and approve this plan
2. Start with Phase 1 optimizations (quick wins)
3. Measure performance improvements
4. Continue with subsequent phases based on results
5. Monitor performance metrics continuously

