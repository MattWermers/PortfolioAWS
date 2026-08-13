const ingredients = [
    "Salt",
    "Black pepper",
    "Olive oil",
    "Vegetable oil",
    "Garlic",
    "Onion",
    "Butter",
    "Milk",
    "Eggs",
    "All-purpose flour",
    "White sugar",
    "Brown sugar",
    "White rice",
    "Dried pasta",
    "Chicken breast",
    "Ground beef",
    "Potatoes",
    "Carrots",
    "Tomatoes",
    "Lemons",
    "Soy sauce",
    "White vinegar",
    "Baking powder",
    "Baking soda",
    "Cinnamon",
    "Rolled oats",
    "Cheddar cheese",
    "Black beans",
    "Lentils",
    "Chicken broth",
    "Tomato paste",
    "San Marzano tomatoes",
    "Red pepper flakes",
    "Anchovies",
    "Capers",
    "Kalamata olives",
    "Pancetta",
    "Andouille sausage",
    "Celery",
    "Green bell pepper",
    "Thyme",
    "Bay leaves",
    "Red wine",
    "White wine",
    "Heavy cream",
    "Parmesan cheese",
    "Pecorino Romano",
    "Garlic powder",
    "Onion powder",
    "Oregano",
    "Basil",
    "Parsley",
    "Beef broth",
    "Pearl onions",
    "Mushrooms",
    "Bacon",
    "Honey",
    "Dijon mustard",
    "Breadcrumbs",
    "Tofu"
];
console.log("WFD: Version 1.1");

/* These get used a frequently(called a lot) so make them global instead of generate them when the function is invoked */
const landing_box = document.getElementById("landing-box");
const running_box = document.getElementById("running-box");
const add_picklist = document.getElementById('add-picklist');

const picked_items = new Set();
const banned_items = new Set();
const button_items = new Map();

function create_button(ingredient) {
    const newButton = document.createElement('button');
    newButton.textContent = ingredient;
    newButton.dataset.item = ingredient;
    newButton.classList.add('p_button')

    /* state is targeted first. First click makes it active THEN ads to list. Next click makes it unactive THEN removes. repeats*/
    newButton.addEventListener('click', () => {
        if (newButton.closest('#add-queryBuilder') || newButton.closest('#landing-box')) {
            if (newButton.classList.contains('active')) {
                if (banned_items.has(newButton.dataset.item)) {
                    banned_items.delete(newButton.dataset.item);
                    picked_items.add(newButton.dataset.item);
                } else {
                    picked_items.delete(newButton.dataset.item);
                    newButton.classList.remove('active');
                }
            } else {
                picked_items.add(newButton.dataset.item);
                newButton.classList.add('active');
            }
        } else if (newButton.closest('#remove-queryBuilder')) {
            if (newButton.classList.contains('active')) {
                if (picked_items.has(newButton.dataset.item)) {
                    picked_items.delete(newButton.dataset.item);
                    banned_items.add(newButton.dataset.item);
                } else {
                    banned_items.delete(newButton.dataset.item);
                    newButton.classList.remove('active');
                }
            } else {
                banned_items.add(newButton.dataset.item);
                newButton.classList.add('active');
            }
        } else {
            console.log('Debug: Anomalous button click detected.', newButton.textContent);
        };
    })
    return newButton;
}

window.addEventListener("load", () => {
    console.log("Debug: Generating button items from ingredient list");
    ingredients.forEach(ingredient => {
        button_items.set(ingredient, create_button(ingredient));
    });
    console.log("Debug: Ingredient buttons created", button_items);

    const landing_picklist = document.getElementById('landing-picklist');
    console.log("Debug: Adding first 5 elements to landing picklist");
    for (const [ingredient, button] of button_items.entries()) {
        if (landing_picklist.children.length < 5) {
            landing_picklist.appendChild(button);
        } else {
            break;
        }
    }
    console.log("Debug: Buttons added to landing picklist");
})

/* find the search buttons and make it so they call the search function */
const search_buttons = document.querySelectorAll('.query');
search_buttons.forEach(button => {
    button.addEventListener('click', search)
})

/* keydown events separate for when the cursor is in a textbox vs when the cursor is somewher else */
function updateSuggestionHighlight(bar, suggestionsContainer, index) {
    const items = suggestionsContainer.querySelectorAll('.suggestion-item');
    items.forEach((item, idx) => {
        if (idx === index) {
            item.classList.add('highlighted');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('highlighted');
        }
    });
}

const search_bars = document.querySelectorAll('.input-textbox');
search_bars.forEach(bar => {
    bar._highlightedIndex = 0;
    bar.addEventListener('keydown', (event) => {
        const suggestions = bar.closest('.searchbar').querySelector('.suggestion-list');
        const isSuggestionsVisible = suggestions && suggestions.style.display !== 'none';
        const items = suggestions ? suggestions.querySelectorAll('.suggestion-item') : [];

        if (isSuggestionsVisible && items.length > 0) {
            if (event.key === 'Tab') {
                event.preventDefault();
                let newIndex = bar._highlightedIndex + (event.shiftKey ? -1 : 1);
                if (newIndex < 0) {
                    newIndex = items.length - 1;
                } else if (newIndex >= items.length) {
                    newIndex = 0;
                }
                bar._highlightedIndex = newIndex;
                updateSuggestionHighlight(bar, suggestions, newIndex);
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                let newIndex = bar._highlightedIndex + 1;
                if (newIndex >= items.length) newIndex = 0;
                bar._highlightedIndex = newIndex;
                updateSuggestionHighlight(bar, suggestions, newIndex);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                let newIndex = bar._highlightedIndex - 1;
                if (newIndex < 0) newIndex = items.length - 1;
                bar._highlightedIndex = newIndex;
                updateSuggestionHighlight(bar, suggestions, newIndex);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                const highlightedItem = items[bar._highlightedIndex];
                if (highlightedItem) {
                    highlightedItem.click();
                }
            } else if (event.key === 'Escape') {
                suggestions.style.display = 'none';
            }
        } else {
            if (event.key === 'Enter') {
                event.preventDefault();
                console.log("\tDebug: Enter pressed while cursor inside searchbar");
                event.stopPropagation();
            }
        }
    });
});
/* this is for when the curor is not in a searchbar */
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        console.log("\tDebug: Enter pressed while outside of searchbar")
        search(event);
    }
})

function update_addpicklists() {
    console.log('\tDebug: Updating addpicklist');
    // add_picklist.innerHTML = '';
    let i = 0; /* interesting way we have to declare here, still figuring out types i guess */
    const remove_picklist = document.getElementById('remove-picklist');
    const landing_picklist = document.getElementById('landing-picklist');
    add_picklist.innerHTML = "";
    /* iterate directly through the items and update i */
    for (const item of picked_items) {
        if (i >= 30) {
            break;
        }
        const new_button = button_items.get(item);
        new_button.classList.add('active');
        if (landing_box.querySelector('button[data-item="' + item + '"]') !== null) {
            console.log("Debug: Button " + item + " is in the landing picklist");
        } else {
            add_picklist.appendChild(new_button);
        }
        i++;
    }
    for (const [ingredient, button] of button_items.entries()) {
        if (i >= 30) {
            break;
        }
        if (!picked_items.has(ingredient) && !banned_items.has(ingredient) && !remove_picklist.contains(button) && !landing_picklist.contains(button)) {
            add_picklist.append(button);
            i++;
        }
    }

}

/* relavant here. observer will resize the add-picklist to match the width of the landing-picklist */
/* turned on at page load, turned off when first query init */
const observe_landing_picklist = new ResizeObserver(entries => {
    for (let entry of entries) {
        const landing_picklist_width = entry.contentRect.width;
        add_picklist.style.width = `${landing_picklist_width}px`;
    }
});
observe_landing_picklist.observe(document.getElementById('landing-picklist'));

function update_removepicklists() {
    console.log('\tDebug: Updating removepicklist');
    let i = 0;
    const remove_picklist = document.getElementById('remove-picklist');
    for (const item of banned_items) {
        if (i >= 30) {
            break;
        }
        const new_button = button_items.get(item);
        remove_picklist.appendChild(new_button);
        i++;
    }
    for (const [ingredient, button] of button_items.entries()) {
        if (i >= 30) {
            break;
        }
        if (!picked_items.has(ingredient) && !banned_items.has(ingredient) && !add_picklist.contains(button)) {
            remove_picklist.appendChild(button);
            i++;
        }
    }
}

/* Function to fetch matching recipes */
async function fetchMatchingRecipes() {
    const params = new URLSearchParams();
    picked_items.forEach(item => params.append('include', item.toLowerCase()));
    banned_items.forEach(item => params.append('exclude', item.toLowerCase()));

    try {
        const response = await fetch(`${SCRIPT_ROOT}/api/recipes/search?${params.toString()}`);
        const recipes = await response.json();
        return recipes;
    } catch (error) {
        console.error("Error searching recipes:", error);
        return [];
    }
}

// following line generated by gemini. SVG of a question mark
const FALLBACK_IMAGE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='12' fill='%23e8e8e8'/%3E%3Ctext x='50' y='62' font-size='52' text-anchor='middle' font-family='sans-serif' fill='%23aaa'%3E%3F%3C/text%3E%3C/svg%3E`;

async function update_displayHolder() {
    if (!g_recipes.length) {
        console.log('Debug: update_displayHolder called with empty g_recipes, skipping.');
        return;
    }
    const recipe = g_recipes[g_index];
    const imgbox = document.getElementById('imgrec-img').querySelector('img');
    const rec_titlebox = document.getElementById('imgrec-title');
    const rec_preptime = document.getElementById('imgrec-prepInfo-time');
    const rec_prepingcount = document.getElementById('imgrec-prepInfo-ingCount');
    const rec_steps = document.getElementById('imgrec-steps');
    const rec_desc = document.getElementById('imgrec-description');
    // fallback SVG if image_url is absent or empty
    imgbox.src = (recipe.image_url && recipe.image_url.trim() !== '') ? recipe.image_url : FALLBACK_IMAGE;
    imgbox.alt = recipe.name || 'Recipe image';

    rec_titlebox.innerText = recipe.name ?? 'failed to load recipe name';
    rec_preptime.innerText = `Time: ${recipe.time ?? 'N/A'}`;
    rec_desc.innerText = recipe.instruction ?? 'failed to load recipe description';

    // Fetch and render ingredient list from API
    try {
        const response = await fetch(`${SCRIPT_ROOT}/api/recipes/${recipe.id}/ingredients`);
        const ingredients = await response.json();
        rec_prepingcount.innerText = `Ingredient Count: ${ingredients.length}`;
        const ol = document.createElement('ol');
        ingredients.forEach(ing => {
            const li = document.createElement('li');
            const qty = ing.ing_qnt != null ? `${ing.ing_qnt} ` : '';
            const unit = ing.ing_unit ? `${ing.ing_unit} ` : '';
            li.textContent = `${qty}${unit}${ing.ing_name}`;
            ol.appendChild(li);
        });
        rec_steps.innerHTML = '';
        rec_steps.appendChild(ol);
    } catch (err) {
        console.error('Failed to fetch ingredients:', err);
        rec_prepingcount.innerText = 'Ingredient Count: N/A';
    }
}

// Rotate through the recipes
document.getElementById('arrow-left').addEventListener('click', () => {
    g_index = (g_index - 1 + g_recipes.length) % g_recipes.length;
    update_displayHolder();
});

document.getElementById('arrow-right').addEventListener('click', () => {
    g_index = (g_index + 1) % g_recipes.length;
    update_displayHolder();
});

// global recipes
let g_recipes = [];
let g_index = 0;

async function search(event) {
    console.log('Debug: Search triggered by ${event.type}');

    if (landing_box.style.display !== 'none') {
        /* Init query */
        console.log("Debug: Init first query");
        console.log("Debug: Submitting items", JSON.stringify(Array.from(picked_items)));
        console.log("\tDebug: Length of picked items", picked_items.size);
        console.log('\tDebug: Changing display type of objects')
        landing_box.style.display = "none";
        running_box.style.display = "flex";
        console.log('\tDebug: Changing display type of objects - success');
        console.log('Debug: Attempting to populate picklists with buttons');

        /* moves the add-picklist to the add-queryBuilder, simpler to work with the dynamic buttons */
        document.getElementById('add-queryBuilder').appendChild(add_picklist);
        observe_landing_picklist.unobserve(document.getElementById('landing-picklist')); /* stop observing the landing picklist */
        add_picklist.style.width = "100%"; /* make the add-picklist take up the full width of the add-queryBuilder */
        document.getElementById('landing-picklist').innerHTML = ""; /* CRITICAL clear the landing picklist so it does not have buttons that are now in the add-picklist */
        update_addpicklists();
        update_removepicklists();
    }
    // get recipes and save to a list, fetchMatchingRecipes grabs the selected items itself
    console.log("Debug: Attempting to fetch recipes")
    g_recipes = await fetchMatchingRecipes();
    console.log('\tDebug: recipes returned:\n' + g_recipes.map(r => `- ${r.name}`).join('\n'))
    g_index = 0;
    update_displayHolder();

}

document.querySelector(".init-search", search);

function add_searcheditem(item) {
    console.log(`Debug: Adding searched item`, item);
    picked_items.add(item);
    update_addpicklists();
}

function remove_searcheditem(item) {
    console.log(`Debug: Removing searched item`, item);
    banned_items.add(item);
    update_removepicklists();
}

/* Predictive text search */
document.querySelectorAll(".input-textbox").forEach(textbox =>
    textbox.addEventListener("input", () => {
        const query = textbox.value.toLowerCase();
        const suggestions = textbox.closest('.searchbar').querySelector('.suggestion-list');
        suggestions.innerHTML = "";

        if (!query) {
            suggestions.style.display = "none";
            return;
        }

        const matches = ingredients.filter(ingredient => ingredient.toLowerCase().includes(query));
        if (matches.length === 0) {
            suggestions.style.display = "none";
            return;
        }
        else {
            const exclude = [];
            if (textbox.closest("#init-searchbar") || textbox.closest("#add-searchbar")) {
                /* if the textbox is in the add-queryBuilder, we want to exclude items that are already picked */
                for (const item of picked_items) {
                    exclude.push(item);
                }
            } else {
                /* if the textbox is in the remove-queryBuilder, we want to exclude items that are already banned */
                for (const item of banned_items) {
                    exclude.push(item);
                }
            }
            let appendedCount = 0;
            for (const match of matches) {
                if (exclude.includes(match)) {
                    continue;
                }
                const suggestion = document.createElement("div");
                suggestion.className = 'suggestion-item';
                suggestion.textContent = match;
                suggestion.tabIndex = -1; // Managed programmatically
                suggestions.appendChild(suggestion);
                appendedCount++;

                /* Sync hover state with keyboard navigation */
                let currentIndex = appendedCount - 1;
                suggestion.addEventListener("mouseenter", () => {
                    textbox._highlightedIndex = currentIndex;
                    updateSuggestionHighlight(textbox, suggestions, currentIndex);
                });

                /* this defines a function we attach to each suggestion item  */
                var suggestion_item_action = "";
                var suggestion_item_function = "";
                if (textbox.closest("#init-searchbar") || textbox.closest("#add-searchbar")) {
                    suggestion_item_function = add_searcheditem;
                } else {
                    suggestion_item_function = remove_searcheditem;
                }
                suggestion_item_action = () => {
                    textbox.value = "";
                    suggestions.style.display = "none";
                    suggestion_item_function(match);
                }
                suggestion.addEventListener("click", suggestion_item_action);
            }
            
            if (appendedCount > 0) {
                suggestions.style.display = "block";
                textbox._highlightedIndex = 0;
                updateSuggestionHighlight(textbox, suggestions, 0);
            } else {
                suggestions.style.display = "none";
            }
        }
    }
    ));

document.addEventListener("click", (event) => {
    if (!event.target.closest(".searchbar")) {
        document.querySelectorAll(".suggestion-list").forEach(suggestions => {
            suggestions.style.display = "none";
        });
    }
});

// Random button
document.getElementById("random-button").addEventListener("click", () => {
    if (g_recipes.length === 0) {
        document.getElementById("random-button").innerText = "Please enter ingredients"
        setTimeout(() => {
            document.getElementById("random-button").innerText = "decide for me"
        }, 1000);
        return;
    } else {
        const random_idx = Math.floor(Math.random() * g_recipes.length);
        g_index = random_idx;
        update_displayHolder();
    }
});