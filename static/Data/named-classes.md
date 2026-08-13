# List of Named Classes

A reference guide for the reusable layouts, components, and classes defined in this project.

---

### **Layouts**

#### `.bodywith-sidebar`
Defines a main page layout with a left-hand navigation/sidebar (taking up 20% width up to a maximum of 200px) and a main content area filling the remaining space.
*   **Structure:**
    *   `.bodywith-sidebar` (Flex container)
        *   `.bar` (Sidebar container)
        *   `.body` (Main body content area)
            *   `#interior` (Wrapper to add 1rem padding)

#### `.flex-object`
A utility layout class that splits content into horizontal columns of equal width.
*   **Structure:**
    *   `.flex-object` (Flex container with dynamic `--direction` and `--gap` parameter overrides)

---

### **Components**

#### `.circular-object`
A utility styling used to frame images inside a circle. The container enforces a 1:1 aspect ratio and circular borders, while the inner image is set to fill the frame cleanly without distortion.
*   **Structure:**
    *   `.circular-object` (Circular wrapper box, 10rem diameter by default)
        *   `> img` (Styled with `object-fit: cover` and centered)

#### `.badge-card`
A specialized card component featuring a circular badge (e.g., profile picture) that overlaps the top border.
*   **Structure:**
    *   `.badge-card` (Relative-positioned card container)
        *   `.card-badge` (Base container for circular badge size)
        *   `.card-badge-absolute` (Modifier: Positions badge absolutely on the top border)
        *   `.card-badge-float` (Modifier: Floats badge on left side inside text box, allowing circular text wrap via `shape-outside`)
        *   `.card-content` (Flexbox column holding titles and text)
            *   `.card-title` (Pushed horizontally to clear the absolute badge, centered on top border)
            *   `.card-body` (Main text region)

#### `.content-card`
A standard content card component styled similarly to the `.badge-card`, but designed for cards that do not have an image badge. Its header title overlaps the top border on the left side, matching the default horizontal position where the badge would sit.
*   **Structure:**
    *   `.content-card` (Relative-positioned card container)
        *   `.card-content` (Padded top to clear the title)
            *   `.card-title` (Absolutely positioned on top border, aligned to the left at `left: 2rem`)
            *   `.card-body` (Main text region)

#### `.nested-timeline` & Company Grouping Structure
The experience section is nested within a standard `.content-card` and styled dynamically using color tokens.

*   **Structure:**
    *   `.company-block` (Container block for each company in the history list)
        *   `.company-header` (Flexbox header containing company name and total duration, with a bottom dividing line)
            *   `.company-name` (Company title using sky-blue accent color)
            *   `.company-duration` (Muted secondary duration text)
        *   `.nested-timeline` (Wrapper container that holds nested roles. By default, draws a vertical connecting timeline line down the left side for companies with multiple roles/promotions)
            *   `.no-line` (Modifier class: Hides the vertical connection line while preserving layout alignment for single-role entries)
            *   `.nested-role` (Represents a role inside the timeline; uses `::before` pseudo-element to render a circular bullet dot centered on the vertical line alignment)
                *   `.role-header` (Flexbox row with title and dates)
                    *   `.role-title` (Role title)
                    *   `.role-date` (Dates)

#### `#site-header` & Navigation
A site header component housing a logo and a navigation bar with discrete hover-dropdown boxes.
*   **Structure:**
    *   `#site-header` (Header flexbox wrapper container)
        *   `.logo` (Brand logo/name area)
        *   `.navbar` (Navigation bar list wrapper)
            *   `.nav-menu` (Flex list container holding list items)
                *   `.nav-item` (Bordered box wrapper utilizing `--color-interactable` color tokens)
                    *   `.nav-link` (Main nav click target link)
                    *   `.dropdown-menu` (Absolutely positioned drop container that opens on hover)

---

### **Interactables & Items**

#### `.button`
Defines a standard clickable button element.
*   **Behavior:** Uses CSS variables for customized colors on hover and normal state, allowing infinite theme variants.