# Stitch Design System v3.0

Authoritative reference for the Stitch (UniCredit) visual design language.
All values map directly to `frontend/lib/theme/app_theme.dart`.

---

## 1. Color Palette

### Brand Colors

| Token              | Hex         | Usage                            |
|--------------------|-------------|----------------------------------|
| `primary`          | `#6C5CE7`   | Buttons, active nav, links       |
| `primaryLight`     | `#E8E5FC`   | Switch tracks, light badges      |
| `primaryDark`      | `#4834D4`   | Gradient endpoints, dark switch  |
| `accent`           | `#00D2FF`   | Cyan highlights, hero gradient   |
| `accentDark`       | `#00B4D8`   | Accent hover states              |
| `secondary`        | `#FF6B6B`   | Coral / warm accent buttons      |

### Text Colors (Light Mode)

| Token            | Hex         | Usage                      |
|------------------|-------------|----------------------------|
| `textPrimary`    | `#1A1B2E`   | Headings, body              |
| `textSecondary`  | `#6B7280`   | Subtitles, captions         |
| `textTertiary`   | `#9CA3AF`   | Hints, inactive nav         |
| `textHint`       | `#D1D5DB`   | Placeholder text            |

### Text Colors (Dark Mode)

| Token                | Hex         |
|----------------------|-------------|
| `textPrimaryDark`    | `#F3F4F6`   |
| `textSecondaryDark`  | `#9CA3AF`   |
| `textTertiaryDark`   | `#6B7280`   |

### Surface Colors

**Light Mode**

| Token              | Hex         | Usage                      |
|--------------------|-------------|----------------------------|
| `background`       | `#F8F9FC`   | Scaffold background         |
| `surface`          | `#FFFFFF`   | Cards, nav bar              |
| `surfaceElevated`  | `#FDFDFE`   | Input fills                 |
| `surfaceBorder`    | `#F0F1F5`   | Card borders                |
| `border`           | `#E5E7EB`   | Input borders               |
| `borderLight`      | `#F3F4F6`   | Switch inactive track       |

**Dark Mode**

| Token                  | Hex         |
|------------------------|-------------|
| `backgroundDark`       | `#0F0F1A`   |
| `surfaceDark`          | `#1A1B2E`   |
| `surfaceElevatedDark`  | `#252640`   |
| `borderDark`           | `#2D2E45`   |

### Semantic Colors

| Token           | Hex         | Light Bg      | Usage              |
|-----------------|-------------|---------------|--------------------|
| `success`       | `#10B981`   | `#D1FAE5`     | Confirmations       |
| `error`         | `#EF4444`   | `#FEE2E2`     | Errors, debits      |
| `warning`       | `#F59E0B`   | `#FEF3C7`     | Warnings            |
| `info`          | `#3B82F6`   | `#DBEAFE`     | Informational       |

### Gradients

| Token             | Colors                           | Usage                          |
|-------------------|----------------------------------|--------------------------------|
| `primaryGradient` | `#6C5CE7` -> `#4834D4`           | Primary buttons, LoadingButton |
| `accentGradient`  | `#00D2FF` -> `#0090FF`           | Accent CTAs                    |
| `heroGradient`    | `#6C5CE7` -> `#00D2FF`           | Nav active indicator           |
| `warmGradient`    | `#FF6B6B` -> `#FF8E53`           | Accent/warm LoadingButton      |
| `darkGradient`    | `#1A1B2E` -> `#2D2E45`           | Dark sections                  |
| `glassGradient`   | `rgba(255,255,255,0.15)` -> `rgba(255,255,255,0.05)` | Glassmorphism  |
| `cardGradient`    | `#6C5CE7` -> `#8B5CF6` -> `#4834D4` | Balance card                |
| `loginGradient`   | `#0F0F1A` -> `#1A1B2E` -> `#2D2E45` | Login screen background     |

### Occasion Gradients (Gift Categories)

| Occasion      | From        | To          |
|---------------|-------------|-------------|
| Birthday      | `#EC4899`   | `#DB2777`   |
| Wedding       | `#F97316`   | `#EA580C`   |
| Graduation    | `#8B5CF6`   | `#6D28D9`   |
| Anniversary   | `#E11D48`   | `#BE123C`   |
| Holiday       | `#10B981`   | `#059669`   |
| New Baby      | `#06B6D4`   | `#0891B2`   |
| Farewell      | `#8B5CF6`   | `#7C3AED`   |
| Congrats      | `#F59E0B`   | `#D97706`   |
| Thank You     | `#14B8A6`   | `#0D9488`   |

### Merchant Gradients

| Merchant      | From        | To          |
|---------------|-------------|-------------|
| Amazon        | `#F97316`   | `#EF4444`   |
| iTunes        | `#EC4899`   | `#BE185D`   |
| Google Play   | `#10B981`   | `#059669`   |
| Steam         | `#6366F1`   | `#4338CA`   |
| Walmart       | `#0EA5E9`   | `#0284C7`   |
| eBay          | `#F59E0B`   | `#D97706`   |

---

## 2. Typography

Two-font system: **Plus Jakarta Sans** for headings/labels, **DM Sans** for body/captions.
Both loaded via `google_fonts` package.

### Type Scale

| Token            | Font Family        | Size | Weight  | Letter Spacing | Line Height | Usage                  |
|------------------|--------------------|------|---------|----------------|-------------|------------------------|
| `displayLarge`   | Plus Jakarta Sans  | 48   | w900    | -2.0           | 1.1         | Hero numbers            |
| `displayMedium`  | Plus Jakarta Sans  | 36   | w800    | -1.5           | 1.15        | Large headings          |
| `h1`             | Plus Jakarta Sans  | 28   | w800    | -0.8           | 1.2         | Screen headings         |
| `h2`             | Plus Jakarta Sans  | 22   | w700    | -0.5           | 1.25        | Section headings        |
| `h3`             | Plus Jakarta Sans  | 18   | w700    | -0.3           | default     | Sub-headings            |
| `screenTitle`    | Plus Jakarta Sans  | 18   | w800    | -0.3           | default     | AppBar titles           |
| `sectionHeader`  | Plus Jakarta Sans  | 16   | w700    | 0              | default     | List section headers    |
| `sectionLabel`   | Plus Jakarta Sans  | 11   | w700    | 1.0            | default     | ALL-CAPS section labels |
| `bodyLarge`      | DM Sans            | 16   | w500    | 0              | 1.5         | Primary body text       |
| `bodyMedium`     | DM Sans            | 14   | w500    | 0              | 1.5         | Default body text       |
| `bodySmall`      | DM Sans            | 13   | w400    | 0              | 1.5         | Secondary body text     |
| `caption`        | DM Sans            | 11   | w400    | 0              | default     | Timestamps, metadata    |
| `fieldLabel`     | Plus Jakarta Sans  | 12   | w700    | 0.5            | default     | Form labels             |
| `buttonText`     | Plus Jakarta Sans  | 16   | w700    | 0              | default     | Button labels           |
| `buttonTextSmall`| Plus Jakarta Sans  | 14   | w600    | 0              | default     | Small button labels     |
| `navLabel`       | DM Sans            | 11   | w600    | 0              | default     | Bottom nav labels       |
| `chipLabel`      | DM Sans            | 12   | w600    | 0              | default     | Filter chips            |

### Special Styles

| Token          | Font Family       | Size | Weight | Letter Spacing | Usage              |
|----------------|-------------------|------|--------|----------------|--------------------|
| `balance`      | Plus Jakarta Sans | 38   | w900   | -1.5           | Balance card amount |
| `balanceLabel` | Plus Jakarta Sans | 11   | w600   | 1.0            | "STITCH BALANCE"   |
| `tierBadge`    | Plus Jakarta Sans | 10   | w800   | 1.2            | Tier badge label    |
| `amount`       | Plus Jakarta Sans | 14   | w700   | 0              | Transaction amounts |
| `errorText`    | DM Sans           | 13   | w500   | 0              | Form errors         |
| `link`         | Plus Jakarta Sans | 14   | w600   | 0              | Clickable links     |

---

## 3. Spacing System

All spacing values live in `AppSpacing`. Use these tokens instead of raw numbers.

| Token         | Value | Usage                            |
|---------------|-------|----------------------------------|
| `xxs`         | 2px   | Micro gaps                        |
| `xs`          | 4px   | Tight gaps                        |
| `sm`          | 8px   | Small gaps, list margins          |
| `md`          | 12px  | Medium gaps, inner padding        |
| `lg`          | 16px  | Standard gaps                     |
| `xl`          | 20px  | Large gaps                        |
| `xxl`         | 24px  | Section padding                   |
| `xxxl`        | 32px  | Major sections                    |
| `xxxxl`       | 48px  | Empty state padding               |
| `pagePadding` | 24px  | Horizontal page margins           |
| `headerTop`   | 16px  | Screen header top padding         |
| `sectionGap`  | 28px  | Vertical gap between sections     |

---

## 4. Border Radius System

All radii live in `AppRadius`.

| Token     | Value | Usage                              |
|-----------|-------|------------------------------------|
| `xs`      | 6px   | Small badges                        |
| `sm`      | 8px   | Skeleton loaders                    |
| `md`      | 12px  | Transaction items, error banners    |
| `lg`      | 16px  | Merchant/occasion grid items        |
| `xl`      | 20px  | Large cards                         |
| `xxl`     | 24px  | Balance card                        |
| `xxxl`    | 32px  | Extra large cards                   |
| `card`    | 20px  | Standard card radius                |
| `button`  | 16px  | Buttons                             |
| `input`   | 14px  | Text fields                         |
| `chip`    | 24px  | Chip/badge pill shapes              |
| `full`    | 999px | Perfect circles                     |

---

## 5. Size System

Fixed size constants in `AppSizes`.

| Token              | Value  | Usage                        |
|--------------------|--------|------------------------------|
| `buttonHeight`     | 56px   | Standard buttons              |
| `buttonHeightSmall`| 44px   | Compact buttons               |
| `inputHeight`      | 52px   | Text inputs                   |
| `iconButton`       | 44px   | Icon-only buttons             |
| `touchTarget`      | 48px   | Minimum touch target          |
| `navBarHeight`     | 80px   | Bottom navigation bar         |
| `avatarSmall`      | 36px   | Inline avatars                |
| `avatarMedium`     | 48px   | List avatars                  |
| `avatarLarge`      | 88px   | Profile header avatar         |
| `balanceCardHeight`| 200px  | Balance card fixed height     |

---

## 6. Component Library

### 6.1 BalanceCard

**File:** `components/balance_card.dart`

Gradient wallet card with tier badge, glassmorphism orbs, and cardholder name.

**Props:**

| Prop              | Type          | Required | Description                  |
|-------------------|---------------|----------|------------------------------|
| `balance`         | `double`      | Yes      | Dollar balance to display     |
| `tier`            | `String`      | Yes      | GOLD, PLATINUM, VIP, etc.     |
| `cardholderName`  | `String`      | Yes      | Display name on card          |
| `onTap`           | `VoidCallback`| No       | Tap handler                   |

**Usage:**
```dart
BalanceCard(
  balance: appState.balance,
  tier: 'GOLD',
  cardholderName: appState.name,
  onTap: () => Navigator.pushNamed(context, '/transactions'),
)
```

### 6.2 TransactionItem

**File:** `components/transaction_item.dart`

Single transaction row with type-based icon, color coding, and amount.

**Props:**

| Prop       | Type          | Required | Description                                    |
|------------|---------------|----------|------------------------------------------------|
| `title`    | `String`      | Yes      | Transaction title                               |
| `subtitle` | `String`      | Yes      | Secondary info (merchant, recipient)             |
| `amount`   | `String`      | Yes      | Formatted amount (prefix with `+` for credits)   |
| `time`     | `String`      | Yes      | Timestamp display string                         |
| `type`     | `String`      | Yes      | One of: `credit`, `debit`, `gift_sent`, `gift_received`, `conversion` |
| `onTap`    | `VoidCallback`| No       | Tap handler                                      |

**Type Config:**

| Type              | Icon                      | Icon Color    | Background      |
|-------------------|---------------------------|---------------|-----------------|
| `credit`          | `add_circle_outline`      | success       | successLight    |
| `debit`           | `arrow_outward`           | error         | errorLight      |
| `gift_sent`       | `card_giftcard`           | secondary     | `#FEE2E2`       |
| `gift_received`   | `redeem`                  | accent        | `#E0F7FA`       |
| `conversion`      | `currency_exchange`       | primary       | primaryLight    |

### 6.3 MerchantGrid

**File:** `components/merchant_grid.dart`

Selectable merchant grid. When a merchant is selected, its tile fills with the merchant's gradient and gains a drop shadow.

**Props:**

| Prop               | Type                  | Required | Default              |
|--------------------|-----------------------|----------|----------------------|
| `selectedMerchant` | `String`              | Yes      | -                    |
| `onSelected`       | `ValueChanged<String>`| Yes      | -                    |
| `merchants`        | `List<MerchantData>`  | No       | `kDefaultMerchants`  |

**MerchantData model:** `name`, `icon`, `gradient`.

**Default merchants:** Amazon, iTunes, Google Play, Steam, Walmart, eBay.

### 6.4 OccasionGrid

**File:** `components/occasion_grid.dart`

3-column grid of occasion categories for gift personalization. All tiles show their gradient; selected tile gets a white border and amplified shadow.

**Props:**

| Prop                | Type                  | Required | Default              |
|---------------------|-----------------------|----------|----------------------|
| `selectedOccasion`  | `String`              | Yes      | -                    |
| `onSelected`        | `ValueChanged<String>`| Yes      | -                    |
| `occasions`         | `List<OccasionData>`  | No       | `kDefaultOccasions`  |

**Default occasions:** Birthday, Wedding, Graduation, Anniversary, Holiday, New Baby, Farewell, Congrats, Thank You, Other.

### 6.5 MediaCapture

**File:** `components/media_capture.dart`

Side-by-side video recording and audio recording cards with status indicators.

**Props:**

| Prop              | Type                     | Required | Description                  |
|-------------------|--------------------------|----------|------------------------------|
| `onVideoSelected` | `ValueChanged<String?>`  | No       | Callback with video filename  |
| `onAudioRecorded` | `ValueChanged<String?>`  | No       | Callback with audio filename  |

**Behavior:**
- Video: Uses `ImagePicker` (camera on mobile, gallery on web). Max 30 seconds.
- Audio: Uses `record` package. Max 60 seconds. Visual timer during recording. Requires microphone permission.
- States: Empty -> Recording/Selecting -> Ready (with check icon and "Tap to re-record")

### 6.6 LoadingButton

**File:** `components/loading_button.dart`

Button with built-in loading spinner, scale animation on press, and double-submit prevention.

**Named Constructors:**

| Constructor            | Gradient          | Usage             |
|------------------------|-------------------|-------------------|
| `LoadingButton()`      | Custom / none     | Configurable      |
| `LoadingButton.primary`| `primaryGradient` | Primary actions   |
| `LoadingButton.accent` | `warmGradient`    | Secondary actions |

**Props:**

| Prop              | Type          | Required | Default                |
|-------------------|---------------|----------|------------------------|
| `label`           | `String`      | Yes      | -                      |
| `onPressed`       | `VoidCallback`| Yes      | -                      |
| `isLoading`       | `bool`        | No       | `false`                |
| `enabled`         | `bool`        | No       | `true`                 |
| `gradient`        | `List<Color>` | No       | null                   |
| `backgroundColor` | `Color`       | No       | `AppColors.primary`    |
| `textColor`       | `Color`       | No       | `Colors.white`         |
| `icon`            | `IconData`    | No       | null                   |
| `height`          | `double`      | No       | `AppSizes.buttonHeight`|
| `borderRadius`    | `double`      | No       | `AppRadius.button`     |
| `fullWidth`       | `bool`        | No       | `true`                 |

**Usage:**
```dart
LoadingButton.primary(
  label: 'Continue',
  onPressed: _handleSubmit,
  isLoading: _submitting,
  icon: Icons.arrow_forward,
)
```

### 6.7 ErrorBanner

**File:** `components/error_banner.dart`

Dismissible inline banner with four severity variants.

**Props:**

| Prop        | Type              | Required | Default                |
|-------------|-------------------|----------|------------------------|
| `message`   | `String`          | Yes      | -                      |
| `onDismiss` | `VoidCallback`    | No       | null (hides close btn) |
| `type`      | `ErrorBannerType` | No       | `ErrorBannerType.error`|

**ErrorBannerType variants:**

| Type      | Background    | Border      | Icon                     |
|-----------|---------------|-------------|--------------------------|
| `error`   | `errorLight`  | `#FCA5A5`   | `error_outline`          |
| `warning` | `warningLight`| `#FCD34D`   | `warning_amber_outlined` |
| `info`    | `infoLight`   | `#93C5FD`   | `info_outline`           |
| `success` | `successLight`| `#6EE7B7`   | `check_circle_outline`   |

### 6.8 EmptyState

**File:** `components/empty_state.dart`

Centered placeholder for empty lists/screens with icon, text, and optional CTA.

**Props:**

| Prop          | Type          | Required | Description               |
|---------------|---------------|----------|---------------------------|
| `icon`        | `IconData`    | Yes      | Large centered icon         |
| `title`       | `String`      | Yes      | Primary message             |
| `subtitle`    | `String`      | Yes      | Secondary message           |
| `actionLabel` | `String`      | No       | CTA button text             |
| `onAction`    | `VoidCallback`| No       | CTA callback                |

### 6.9 PaginatedList

**File:** `components/paginated_list.dart`

Generic infinite-scroll list with cursor-based pagination, pull-to-refresh, and loading/error/empty states.

**Props:**

| Prop                | Type                       | Required | Default                 |
|---------------------|----------------------------|----------|-------------------------|
| `fetcher`           | `PageFetcher<T>`           | Yes      | -                       |
| `itemBuilder`       | `Widget Function(ctx,T,i)` | Yes      | -                       |
| `separatorBuilder`  | `Widget Function(ctx)`     | No       | null                    |
| `header`            | `Widget`                   | No       | null                    |
| `emptyState`        | `EmptyState`               | No       | Default "Nothing here"  |
| `padding`           | `EdgeInsetsGeometry`       | No       | `pagePadding` horizontal|
| `loadMoreThreshold` | `double`                   | No       | `200.0` px              |

**PageResult model:**
```dart
PageResult<T>({
  required List<T> items,
  String? nextCursor,
  bool hasMore = true,
})
```

**Usage:**
```dart
PaginatedList<Transaction>(
  fetcher: (cursor) => api.getTransactions(cursor: cursor),
  itemBuilder: (context, txn, index) => TransactionItem(
    title: txn.title,
    amount: txn.amount,
    type: txn.type,
    ...
  ),
  emptyState: EmptyState(
    icon: Icons.receipt_long_outlined,
    title: 'No transactions yet',
    subtitle: 'Your activity will appear here.',
  ),
)
```

---

## 7. Glassmorphism Helpers

**Class:** `GlassDecoration` in `app_theme.dart`

### GlassDecoration.card()

Returns a `BoxDecoration` with semi-transparent gradient and border. Use on premium/featured cards.

| Param          | Type     | Default          | Description                  |
|----------------|----------|------------------|------------------------------|
| `borderRadius` | `double` | `AppRadius.card`  | Corner radius                |
| `borderColor`  | `Color?` | `white @ 0.2`     | Border color                 |
| `opacity`      | `double` | `0.12`            | Glass opacity                |

### GlassDecoration.frosted()

Wraps a child widget with `BackdropFilter` blur and translucent tint. For sections that sit atop images/gradients.

| Param          | Type     | Default          | Description                  |
|----------------|----------|------------------|------------------------------|
| `child`        | `Widget` | (required)        | Content widget               |
| `blurX`        | `double` | `20`              | Horizontal blur sigma        |
| `blurY`        | `double` | `20`              | Vertical blur sigma          |
| `borderRadius` | `double` | `AppRadius.card`  | Corner radius                |
| `tint`         | `Color?` | `white @ 0.1`     | Overlay tint                 |

### GlassDecoration.darkFrosted()

Same as `frosted()` but with a dark tint (`black @ 0.3`). For dark-on-dark glassmorphism.

---

## 8. Skeleton Loader

**Class:** `SkeletonBox` in `app_theme.dart`

Animated shimmer placeholder. Opacity oscillates between 0.04 and 0.10 over 1500ms.

**Props:**

| Prop           | Type     | Required | Default        |
|----------------|----------|----------|----------------|
| `width`        | `double` | Yes      | -              |
| `height`       | `double` | Yes      | -              |
| `borderRadius` | `double` | No       | `AppRadius.sm` |

```dart
Row(
  children: [
    SkeletonBox(width: 44, height: 44, borderRadius: AppRadius.md),
    SizedBox(width: 12),
    Column(children: [
      SkeletonBox(width: 120, height: 14),
      SizedBox(height: 6),
      SkeletonBox(width: 80, height: 12),
    ]),
  ],
)
```

---

## 9. Animation & Transition Guidelines

### Standard Durations

| Context               | Duration | Curve              |
|-----------------------|----------|--------------------|
| Micro-interactions    | 100ms    | `easeInOut`        |
| Selection animations  | 250ms    | `easeOutCubic`     |
| State transitions     | 300ms    | `easeInOut`        |
| Page transitions      | 300ms    | Material default   |
| Skeleton shimmer      | 1500ms   | `easeInOut`        |

### Patterns Used

| Pattern                  | Component(s)                 | Description                                          |
|--------------------------|------------------------------|------------------------------------------------------|
| Scale on press           | LoadingButton                | 1.0 -> 0.97 on tap-down, reverse on release          |
| AnimatedContainer        | MerchantGrid, OccasionGrid   | Color/border/shadow transitions on selection          |
| AnimatedSwitcher         | Bottom nav icons             | Cross-fade between filled/outlined icons              |
| AnimatedSize             | ErrorBanner                  | Smooth height change on show/dismiss                  |
| AnimatedOpacity          | LoadingButton                | Fade to 0.5 when disabled                            |
| AnimatedContainer (nav)  | Active indicator dot         | Width animates 0 <-> 24px with gradient fill          |
| Fade + Slide             | Login screen fields          | Staggered entrance animation on initial render        |
| Scale + Counter          | Gift reveal screen           | Scale-up reveal + animated amount counter             |

### Page Transitions

All in-tab navigation uses `MaterialPageRoute` (default slide-from-right on iOS, fade-through on Android with Material 3).

---

## 10. Accessibility Standards

### Touch Targets

All interactive elements meet the 48x48dp minimum touch target (see `AppSizes.touchTarget`).

### Color Contrast

- Body text (`#1A1B2E` on `#F8F9FC`): contrast ratio > 15:1 (AAA)
- Secondary text (`#6B7280` on `#F8F9FC`): contrast ratio > 4.6:1 (AA)
- Button text (white on `#6C5CE7`): contrast ratio > 4.6:1 (AA)
- Error text (`#991B1B` on `#FEE2E2`): contrast ratio > 7:1 (AAA)

### Semantic Structure

- Form fields use `InputDecoration` with `hintText` for screen reader labels
- `GestureDetector` widgets use `HitTestBehavior.opaque` for full-area taps
- Error messages are surfaced via `ErrorBanner` (inline) and `SnackBar` (ephemeral)
- Amounts use signed prefixes (`+`/`-`) with color coding for redundant visual indication

### Error Messages

All user-facing error messages are sanitized through `AppWidgets._sanitizeErrorMessage()`, which replaces raw exception names (`SocketException`, `FormatException`, `ClientException`, `HandshakeException`, `TimeoutException`) with a generic "Something went wrong. Please try again." message. Internal exception details never reach the user.

---

## 11. Theme Configuration

### ThemeData Builders

Two `ThemeData` builders in `AppTheme`:

- `AppTheme.light()` -- Material 3 light theme with Plus Jakarta Sans text theme
- `AppTheme.dark()` -- Material 3 dark theme with dark surface/text overrides

Both configure:
- `colorScheme` from seed color `#6C5CE7`
- `appBarTheme` with zero elevation
- `elevatedButtonTheme` using `AppWidgets.primaryButton`
- `inputDecorationTheme` with consistent border styling
- `switchTheme` with primary/light track colors
- `dividerTheme` matching surface borders

### Integration

```dart
// main.dart
MaterialApp(
  theme: AppTheme.light(),
  darkTheme: AppTheme.dark(),
  themeMode: ThemeMode.light,  // Default to light
)
```

---

## 12. Screen Inventory

| Screen                          | File                               | Tab       | Key Components Used                           |
|---------------------------------|------------------------------------|-----------|------------------------------------------------|
| Login                           | `login_screen.dart`                | -         | LoadingButton, ErrorBanner                     |
| Wallet Dashboard                | `wallet_dashboard_screen.dart`     | Wallet    | BalanceCard, TransactionItem, EmptyState       |
| Transaction History             | `transaction_history_screen.dart`  | Wallet/*  | TransactionItem, filter chips                  |
| Convert Gift Card               | `convert_gift_card_screen.dart`    | Convert   | MerchantGrid, LoadingButton (3-step wizard)    |
| Personalize Gift                | `personalize_your_gift_screen.dart`| Wallet/*  | OccasionGrid, MediaCapture, LoadingButton      |
| Gift Reveal                     | `gift_reveal_experience_screen.dart`| Wallet/*| Scale/counter animations                       |
| Gift Claim                      | `gift_claim_screen.dart`           | Wallet/*  | LoadingButton, ErrorBanner                     |
| Add Credit                      | `add_credit_screen.dart`           | Wallet/*  | LoadingButton, amount grid                     |
| Admin Overview                  | `admin_overview_screen.dart`       | Admin     | ErrorBanner (admin-only)                       |
| Admin User Detail               | `admin_user_detail_screen.dart`    | Admin/*   | Dialogs for tier change/lock                   |
| Profile                         | `profile_screen.dart`              | Profile   | LoadingButton                                  |
| Password Reset                  | `password_reset_screen.dart`       | Profile/* | LoadingButton, ErrorBanner                     |

`*` = pushed as sub-route within parent tab's nested navigator.
