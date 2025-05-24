# SongSymmetry Design System

A comprehensive design system for consistent UI components across the SongSymmetry application.

## Components

### Text Components

```tsx
import { Text, Heading, Display, Caption } from '@/components/design-system';

// Basic text with variants
<Text variant="body-large" color="primary">
  Regular body text
</Text>

// Semantic headings
<Heading level={2} color="gradient-primary">
  Page Title
</Heading>

// Display text for hero sections
<Display size="large" color="gradient-secondary">
  Your 2024 Wrapped
</Display>

// Small caption text
<Caption size="small">
  Additional information
</Caption>
```

### Button Components

```tsx
import { AppButton, PlayButton, BackButton, ExternalLinkButton, IconButton } from '@/components/design-system';
import { Heart } from 'lucide-react';

// Standard buttons
<AppButton variant="spotify" size="lg">
  Play Playlist
</AppButton>

<AppButton variant="outline" leftIcon={Heart}>
  Add to Favorites
</AppButton>

// Specialized buttons
<PlayButton>Play</PlayButton>
<BackButton />
<ExternalLinkButton href="https://spotify.com">
  Open in Spotify
</ExternalLinkButton>

// Icon-only button
<IconButton icon={Heart} label="Like" variant="ghost" />
```

### Layout Components

```tsx
import { Stack, Grid, Flex, AppContainer, Section, Center, Spacer } from '@/components/design-system';

// Vertical stack with spacing
<Stack spacing="lg" align="center">
  <Text>Item 1</Text>
  <Text>Item 2</Text>
</Stack>

// Responsive grid
<Grid 
  cols={4} 
  responsive={{ sm: 1, md: 2, lg: 3, xl: 4 }}
  gap="md"
>
  {items.map(item => <div key={item.id}>{item.content}</div>)}
</Grid>

// Container with max-width
<AppContainer size="lg" padding="xl">
  <Text>Centered content</Text>
</AppContainer>

// Section with background
<Section variant="accent" padding="lg">
  <Text>Section content</Text>
</Section>
```

### Card Components

```tsx
import { AppCard, StatCard, PlaylistCard, TrackCard } from '@/components/design-system';

// Basic card
<AppCard variant="accent" padding="lg" hoverable>
  <Text>Card content</Text>
</AppCard>

// Stat display card
<StatCard 
  title="Total Tracks"
  value={150}
  icon={MusicIcon}
  variant="spotify"
/>

// Playlist card with actions
<PlaylistCard
  image="/playlist-cover.jpg"
  title="Your Top Songs 2024"
  year={2024}
  trackCount={50}
  onClick={() => navigate('/playlist/123')}
  onPlay={() => playPlaylist()}
  onExternalLink={() => window.open('https://spotify.com/playlist/123')}
/>

// Track listing
<TrackCard
  image="/album-cover.jpg"
  title="Song Title"
  artist="Artist Name"
  duration="3:45"
  popularity={85}
  index={1}
  onPlay={() => playTrack()}
/>
```

### Icon Components

```tsx
import { Icon, MusicIcon, PlayIcon, IconAvatar } from '@/components/design-system';

// Basic icon
<Icon name="Music" size="lg" color="spotify" />

// Predefined icons
<MusicIcon size="md" color="accent" />
<PlayIcon size="sm" />

// Icon with background
<IconAvatar icon={MusicIcon} variant="spotify" size="xl" />
```

## Design Tokens

### Colors
- `primary`: White text
- `secondary`: Light gray text  
- `muted`: Dark gray text
- `accent`: Purple accent
- `success`: Green
- `warning`: Yellow
- `error`: Red
- `spotify`: Spotify green
- `gradient-primary`: Purple to pink gradient
- `gradient-secondary`: Spotify green to purple to pink gradient

### Sizes
- `xs`: Extra small
- `sm`: Small
- `md`: Medium (default)
- `lg`: Large
- `xl`: Extra large
- `2xl`: 2x large
- `3xl`: 3x large

### Spacing
- `xs`: 8px (space-2)
- `sm`: 12px (space-3)
- `md`: 16px (space-4)
- `lg`: 24px (space-6)
- `xl`: 32px (space-8)
- `2xl`: 40px (space-10)
- `3xl`: 48px (space-12)

## Usage Examples

### Playlist Page Header
```tsx
<Section variant="accent" padding="lg">
  <Flex gap="lg">
    <img src={playlist.image} className="w-80 aspect-square rounded-lg" />
    <Stack spacing="md">
      <Display size="medium">{playlist.name}</Display>
      <Text color="secondary">{playlist.description}</Text>
      <Flex gap="md">
        <PlayButton size="lg">Play</PlayButton>
        <ExternalLinkButton href={playlist.spotifyUrl}>
          Open in Spotify
        </ExternalLinkButton>
      </Flex>
    </Stack>
  </Flex>
</Section>
```

### Stats Grid
```tsx
<Grid cols={4} responsive={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap="lg">
  <StatCard 
    title="Total Tracks" 
    value={stats.totalTracks}
    icon={MusicIcon}
    variant="spotify"
  />
  <StatCard 
    title="Average Popularity" 
    value={`${stats.averagePopularity}%`}
    icon={TrendingUpIcon}
    variant="accent"
  />
  <StatCard 
    title="Top Decade" 
    value={stats.topDecade}
    icon={CalendarIcon}
    variant="gradient"
  />
  <StatCard 
    title="Energy Level" 
    value={stats.energyLevel}
    icon={ZapIcon}
    variant="default"
  />
</Grid>
```

### Track Listing
```tsx
<Stack spacing="sm">
  {tracks.map((track, index) => (
    <TrackCard
      key={track.id}
      image={track.album.image}
      title={track.name}
      artist={track.artists.join(', ')}
      duration={formatDuration(track.duration)}
      popularity={track.popularity}
      index={index + 1}
      onPlay={() => playTrack(track)}
    />
  ))}
</Stack>
```

## Benefits

1. **Consistency**: All components follow the same design patterns
2. **Reusability**: Write once, use everywhere
3. **Maintainability**: Update styles in one place
4. **Accessibility**: Built-in focus states and aria labels
5. **Performance**: Optimized with proper TypeScript types
6. **Developer Experience**: IntelliSense support and clear APIs

## Migration Guide

To migrate existing components:

1. Replace `<Button>` with `<AppButton>`
2. Replace manual text styling with `<Text>` components
3. Replace custom layouts with `<Stack>`, `<Grid>`, or `<Flex>`
4. Replace manual cards with `<AppCard>` variants
5. Replace inline icons with `<Icon>` components

The design system is backward compatible and can be adopted incrementally.