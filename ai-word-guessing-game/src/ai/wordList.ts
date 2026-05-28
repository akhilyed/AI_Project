/**
 * wordList.ts
 * -----------
 * A large, diverse dataset of common English words used by the game.
 * Words span many categories: animals, food, objects, actions, places, etc.
 * The pickRandomWord() function randomly selects one each game.
 *
 * To extend the dataset simply add more strings to the WORD_LIST array below.
 */

export const WORD_LIST: string[] = [
  // Animals
  "elephant", "giraffe", "penguin", "dolphin", "cheetah", "crocodile",
  "kangaroo", "flamingo", "porcupine", "chameleon", "salamander", "jellyfish",
  "octopus", "seahorse", "platypus", "armadillo", "wolverine", "albatross",
  "hamster", "goldfish", "parrot", "leopard", "gorilla", "chimpanzee",
  "rhinoceros", "hippopotamus", "peacock", "toucan", "meerkat", "mongoose",
  "piranha", "anaconda", "komodo", "walrus", "narwhal", "manatee",
  "hedgehog", "chipmunk", "raccoon", "opossum", "beaver", "otter",
  "badger", "weasel", "ferret", "lynx", "jaguar", "ocelot",
  "pelican", "heron", "osprey", "falcon", "condor", "macaw",

  // Food & Drink
  "avocado", "broccoli", "cucumber", "pineapple", "blueberry", "strawberry",
  "watermelon", "cantaloupe", "asparagus", "artichoke", "cauliflower",
  "cinnamon", "cardamom", "turmeric", "oregano", "paprika", "saffron",
  "croissant", "pretzel", "brownie", "macaron", "tiramisu", "cannoli",
  "lasagna", "risotto", "paella", "sushi", "tempura", "ramen",
  "burrito", "enchilada", "guacamole", "hummus", "falafel", "shawarma",
  "baklava", "churro", "doughnut", "waffle", "pancake", "crepe",
  "espresso", "cappuccino", "lemonade", "smoothie", "milkshake",
  "popcorn", "pretzel", "tortilla", "focaccia", "baguette", "sourdough",
  "caramel", "marshmallow", "butterscotch", "marzipan",

  // Objects / Household
  "umbrella", "backpack", "suitcase", "lantern", "compass", "telescope",
  "microscope", "binoculars", "calculator", "thermometer", "barometer",
  "calendar", "envelope", "stapler", "scissors", "bookmark", "flashlight",
  "hammock", "chandelier", "fireplace", "chimney", "curtain", "blinds",
  "mattress", "pillow", "blanket", "duvet", "hammock", "bathtub",
  "faucet", "shower", "mirror", "cabinet", "drawer", "wardrobe",
  "refrigerator", "microwave", "toaster", "blender", "kettle", "colander",
  "spatula", "whisk", "ladle", "tongs", "grater",

  // Nature / Environment
  "volcano", "glacier", "avalanche", "tornado", "hurricane", "earthquake",
  "tsunami", "thunderstorm", "lightning", "rainbow", "snowflake", "blizzard",
  "waterfall", "canyon", "plateau", "peninsula", "archipelago", "lagoon",
  "mangrove", "tundra", "savanna", "rainforest", "meadow", "swamp",
  "geyser", "stalactite", "stalagmite", "cavern", "cliff", "dune",
  "pebble", "boulder", "granite", "marble", "obsidian", "quartz",
  "coral", "seaweed", "kelp", "moss", "lichen", "fern",
  "mushroom", "cactus", "bamboo", "sequoia", "willow", "magnolia",

  // Places / Buildings
  "cathedral", "mosque", "synagogue", "temple", "monastery", "lighthouse",
  "windmill", "aqueduct", "colosseum", "pyramid", "igloo", "castle",
  "dungeon", "fortress", "citadel", "barracks", "hangar", "warehouse",
  "observatory", "planetarium", "aquarium", "museum", "library", "stadium",
  "amphitheater", "greenhouse", "laboratory", "pharmacy", "hospital",
  "bakery", "butcher", "laundromat", "barbershop", "embassy", "consulate",
  "marina", "harbor", "pier", "lighthouse", "bridge", "tunnel",
  "boulevard", "alley", "courtyard", "balcony", "terrace", "gazebo",

  // Vehicles / Transport
  "submarine", "helicopter", "parachute", "gondola", "kayak", "canoe",
  "catamaran", "hovercraft", "zeppelin", "monorail", "trolley", "rickshaw",
  "tractor", "bulldozer", "excavator", "forklift", "ambulance", "firetruck",
  "locomotive", "caboose", "gondola", "glider", "spaceship", "rover",

  // Actions / Concepts
  "hibernation", "migration", "camouflage", "photosynthesis", "evaporation",
  "condensation", "reflection", "refraction", "gravity", "magnetism",
  "electricity", "combustion", "fermentation", "decomposition", "pollination",
  "meditation", "negotiation", "celebration", "graduation", "vaccination",
  "renovation", "excavation", "navigation", "exploration", "collaboration",

  // Clothing / Accessories
  "sneakers", "sandals", "moccasin", "stiletto", "beret", "sombrero",
  "turban", "tiara", "monocle", "pendant", "bracelet", "anklet",
  "cardigan", "turtleneck", "suspenders", "overalls", "trenchcoat", "poncho",

  // Sports / Activities
  "archery", "fencing", "wrestling", "gymnastics", "trampoline", "surfing",
  "skateboarding", "snowboarding", "paragliding", "windsurfing", "bobsled",
  "croquet", "badminton", "lacrosse", "handball", "curling", "biathlon",
  "decathlon", "triathlon", "marathon", "steeplechase",

  // Music / Arts
  "accordion", "harmonica", "xylophone", "marimba", "didgeridoo", "sitar",
  "banjo", "ukulele", "trombone", "tuba", "oboe", "bassoon", "cello",
  "mandolin", "harpsichord", "theremin", "turntable",
  "fresco", "mosaic", "tapestry", "origami", "calligraphy", "graffiti",
  "sculpture", "pottery", "woodcarving",

  // Technology
  "algorithm", "encryption", "bandwidth", "firewall", "database", "protocol",
  "server", "browser", "compiler", "processor", "semiconductor", "transistor",
  "satellite", "antenna", "hologram", "microchip", "circuitry", "router",

  // Miscellaneous fun words
  "boomerang", "kaleidoscope", "periscope", "labyrinth", "catapult",
  "trebuchet", "hourglass", "sundial", "abacus", "sextant",
  "hieroglyphics", "papyrus", "parchment", "scroll", "manuscript",
  "hammock", "lasso", "slingshot", "pitchfork", "sickle", "anvil",
  "bellows", "cauldron", "goblet", "chalice", "scepter", "orb",
  "tapestry", "cobblestone", "drawbridge", "moat", "portcullis",
  "quill", "inkwell", "candelabra", "hourglass",
];

/**
 * Returns a random word from WORD_LIST.
 */
export function pickRandomWord(): string {
  const idx = Math.floor(Math.random() * WORD_LIST.length);
  return WORD_LIST[idx].toLowerCase();
}
