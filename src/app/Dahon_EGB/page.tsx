import { ShopProductImage } from './ShopProductImage';

const application = {
  name: 'Dahon Abre',
  age: '28',
  birthday: 'Spring 18',
  occupation:
    'Merchant — proprietor of The Verdant Remedy, a Verdamere apothecary and plant-doctor\'s office in Evermere while the Grand Bazaar is being restored. Sells season stones, spring teas, herb sachets, dried flowers, and heirloom seeds; diagnoses sick soil and distressed plants; takes season-charm commissions and practical counsel for merchants and households.',
  residence: 'Evermere (originally from Verdamere, the Spring village)',
  race: 'Elf of Verdamere. Plants tend to gather near him; his botanical magic is learned earth craft—natural magic, sigils, runes, and song. Viridienne lineage of matriarchal House Abre.',
  background: `Dahon is the first son of Lady Mireille Abre, head of an old matriarchal elven house in Verdamere—the eternal Spring village whose regional god keeps the season still. He was raised to preserve House Abre and support his younger sister Lluem, the future matriarch.

Six years ago, while the Great War still raged elsewhere on Verdanys, the Hollowroot Blight devastated the Abre estate. Plants looked healthy while the mana inside their roots vanished. It crossed connected soil and caused fatal mana exhaustion in those repeatedly exposed. Many relatives, gardeners, retainers, and scholars died containing it. Dahon survived with a branching scar on his left palm after an infected root pierced his hand; his aunt spent the last of her mana on an emergency sigil seal before the contamination could spread.

The war ended one year ago. Evermere stayed neutral, but trade thinned, the Grand Bazaar closed, and the city lost touch with the four season villages. When young Duke Theodore sent recruitment posters seeking merchants and citizens to revive the city, House Abre answered. Dahon wrote his application, was welcomed to Evermere, and opened The Verdant Remedy ahead of the bazaar's return. He wants to rebuild alliances, study plants from all four eternal seasons, and learn what caused the blight before it can return.`,
  personality: `Gentle, observant, and almost painfully accommodating. Dahon remembers small details and uses them to make others comfortable, but he struggles to say no and hides exhaustion until it slows him down. He believes affection must be earned through usefulness, so he is easy to like and difficult to truly know. Beneath his mild manners is stubborn devotion—once he claims a person, garden, or duty as his responsibility, he is terribly hard to move. He keeps the spring god's festivals and respects the Great Dragons in the quiet way most Verdamere folk do.`,
  designNotes: {
    height: '5\'11" / 180 cm',
    weight: 'Slender; lean wiry build from fieldwork',
    build: 'Tall, narrow-shouldered, graceful posture; moves carefully like someone used to handling fragile things',
    hair: 'Long, messy yellow-green hair with soft bangs and a small tuft at the crown; often half-tied for work',
    eyes: 'Deep blue, attentive and gentle',
    skin: 'Fair elven complexion',
    ears: 'Long pointed ears',
    clothing:
      'Olive-green cropped jacket with gold trim, rose-pink tunic and shoulder capelet, white fitted trousers, brown knee-high boots, brown belt and field pouch',
    scars:
      'Branching blight scar on the left palm; darkens when he overtaxes his magic or touches badly corrupted mana',
    notable:
      'Often carries tea, chalk, pruning scissors, seed envelopes, and too many notebooks; smooths his sleeves when anxious',
  },
} as const;

const skillsByCategory = {
  magic: [
    'Earth affinity — botanical natural magic (uncommon): eases root shock, steadies germination, helps injured plants recover',
    'Season stones and runic sigils for plot timing, frost shelter, dormancy, moisture balance, and small out-of-season pockets',
    'Garden wards and Viridienne growing hymns for soil mana health, pest deterrence, blight isolation, and distressed plants',
    'Earthen shaping for soil structure, terracing, and field repair',
  ],
  work: [
    'Plant and soil diagnosis, blight screening, companion planting plans, crop rotation, seed preservation, and greenhouse recovery',
    'Season-charm commissions, Verdamere shelf stock, bazaar-day preparation, and merchant counsel',
    'Household stewardship: budgets, pantry planning, staff routines, correspondence, and guest etiquette',
  ],
  hobbies: [
    'Embroidery and mending',
    'Board games and botanical trivia (unexpectedly competitive)',
    'Seed exchanges, annotated herbals, and quiet tea with one or two friends',
    'Humming traditional growing songs while working—he gets embarrassed if anyone mentions it',
  ],
} as const;

const SHOP_IMG = '/Dahon_EGB/shop';
const STONE_IMG = '/Dahon_EGB/stones';

/** Drop PNGs in public/Dahon_EGB/shop/ using each item's imageFile name. */
const shopCatalog = [
  {
    id: 'vernal-quickening-stone',
    kind: 'product',
    name: 'Vernal Quickening Stone',
    price: '30G',
    category: 'season_charm',
    categoryLabel: 'Season charm',
    image: `${STONE_IMG}/spring-sun-stone.png`,
    imageFile: null,
    seasonSlug: 'spring',
    blurb:
      'Softens hard ground and steadies new seeds through their first fragile week. One planter or bed. Charge lasts about a week before renewal.',
    tags: ['season_charm', 'planter_use'],
  },
  {
    id: 'sunstead-charm-stone',
    kind: 'product',
    name: 'Sunstead Charm Stone',
    price: '32G',
    category: 'season_charm',
    categoryLabel: 'Season charm',
    image: `${STONE_IMG}/summer-sun-stone.png`,
    imageFile: null,
    seasonSlug: 'summer',
    blurb:
      'Eases heat stress and cold snaps in a small bed. Good for window boxes and starter plots—renew as the charge fades.',
    tags: ['season_charm', 'planter_use'],
  },
  {
    id: 'latekeepers-blessing-stone',
    kind: 'product',
    name: 'Latekeeper\'s Blessing Stone',
    price: '32G',
    category: 'season_charm',
    categoryLabel: 'Season charm',
    image: `${STONE_IMG}/autumn-sun-stone.png`,
    imageFile: null,
    seasonSlug: 'autumn',
    blurb:
      'Helps late crops finish before frost and keeps picked goods from turning too quickly.',
    tags: ['season_charm', 'planter_use'],
  },
  {
    id: 'winterkeeping-stone',
    kind: 'product',
    name: 'Winterkeeping Stone',
    price: '28G',
    category: 'season_charm',
    categoryLabel: 'Season charm',
    image: `${STONE_IMG}/winter-sun-stone.png`,
    imageFile: null,
    seasonSlug: 'winter',
    blurb:
      'Encourages dormancy, slows spoilage in storage, and shields hardy roots from ordinary cold.',
    tags: ['season_charm', 'planter_use'],
  },
  {
    id: 'meadowwake-tea',
    kind: 'product',
    name: 'Meadowwake Tea',
    price: '12G',
    category: 'apothecary',
    categoryLabel: 'Apothecary',
    image: `${SHOP_IMG}/meadowwake-tea.png`,
    imageFile: 'meadowwake-tea.png',
    seasonSlug: null,
    blurb:
      'A mild Verdamere blend—weedy, floral, good after a long day in the field.',
    tags: ['tea', 'rest'],
  },
  {
    id: 'dewkeeper-sachet',
    kind: 'product',
    name: 'Dewkeeper Sachet',
    price: '15G',
    category: 'apothecary',
    categoryLabel: 'Apothecary',
    image: `${SHOP_IMG}/dewkeeper-sachet.png`,
    imageFile: 'dewkeeper-sachet.png',
    seasonSlug: null,
    blurb:
      'Dried herbs and a tiny moisture ward for window boxes and bedside planters. Keeps fussy pots from drying out overnight.',
    tags: ['herbs', 'planter_use'],
  },
  {
    id: 'root-safe-salve',
    kind: 'product',
    name: 'Root-Safe Salve',
    price: '18G',
    category: 'apothecary',
    categoryLabel: 'Apothecary',
    image: `${SHOP_IMG}/root-safe-salve.png`,
    imageFile: 'root-safe-salve.png',
    seasonSlug: null,
    blurb:
      'Herbal rub for cracked hands and minor scrapes after fieldwork.',
    tags: ['salve', 'fieldwork'],
  },
  {
    id: 'pollen-path-chart',
    kind: 'product',
    name: 'Pollen Path Chart',
    price: '6G',
    category: 'supplies',
    categoryLabel: 'Supplies',
    image: `${SHOP_IMG}/pollen-path-chart.png`,
    imageFile: 'pollen-path-chart.png',
    seasonSlug: null,
    blurb:
      'Illustrated companion-planting guide for small plots—what likes whom, and what to keep apart.',
    tags: ['guide', 'agricultural_use'],
  },
  {
    id: 'rootmend-consultation',
    kind: 'service',
    name: 'Rootmend Consultation',
    price: '25G',
    category: 'field_magic',
    categoryLabel: 'Natural Magic (uncommon)',
    image: `${SHOP_IMG}/rootmend-consultation.png`,
    imageFile: 'rootmend-consultation.png',
    seasonSlug: null,
    stockLabel: 'Walk-in welcome',
    blurb:
      'Reads wilt, root shock, mana-sick soil, and early blight signs. Helps plants settle back into healthy growth.',
    tags: ['consultation', 'diagnosis'],
  },
  {
    id: 'garden-wards',
    kind: 'service',
    name: 'Garden Wards',
    price: '35G',
    category: 'field_magic',
    categoryLabel: 'Sigils and Runes',
    image: `${SHOP_IMG}/garden-wards.png`,
    imageFile: 'garden-wards.png',
    seasonSlug: null,
    stockLabel: 'Per plot · walk-in',
    blurb:
      'Deters pests, balances moisture, flags disturbances in soil mana, and isolates sickness before it spreads.',
    tags: ['wards', 'plot_magic'],
  },
] as const;

const shelfItems = shopCatalog.filter((item) => item.kind === 'product');
const serviceItems = shopCatalog.filter((item) => item.kind === 'service');

const relations = [
  {
    id: 'lluem',
    name: 'Lluem Abre',
    role: 'Younger sister · Heir',
    status: 'Family',
    hearts: 10,
    portrait: '/Dahon_EGB/relations/lluem.png',
    initials: 'LA',
    blurb:
      "Dahon's nine year old sister and the future matriarch of House Abre. He acts as brother, tutor, protector, and sometimes nearly a third parent. Lluem would prefer he stop hiding every difficulty from her.",
  },
  {
    id: 'mireille',
    name: 'Lady Mireille Abre',
    role: 'Mother · Head of house',
    status: 'Family',
    hearts: 9,
    portrait: '/Dahon_EGB/relations/mireille.png',
    initials: 'MA',
    blurb:
      "A capable, demanding matriarch who trusts Dahon with the family's most sensitive work. Their love is real, though much of it has always been expressed through duty and expectation.",
  },
] as const;

const trivia = [
  'He smooths his sleeves when anxious and offers tea whenever he does not know what else to say.',
  'He hums growing songs while concentrating, then becomes embarrassed if anyone admits they heard him.',
  'His field satchel contains chalk, pruning scissors, seed envelopes, string, and far too many notebooks.',
  'He is unexpectedly competitive at board games and botanical trivia.',
  'Lluem sends him drawings, complaints about tutors, and strict reminders to eat dinner. He keeps every letter.',
  'He checks nearby plants for signs of illness without realizing he is doing it.',
  'He arrived in Evermere one year after the war ended, answering Duke Theodore\'s recruitment poster.',
  'He keeps a chalk mark on each season stone showing which way the sigil should face.',
  'Customers sometimes leave tea cups on his counter. He washes them without comment.',
] as const;

const PORTRAIT = '/Dahon_EGB/dahon_EGB.png?v=2';
const MOOD_IMG = '/Dahon_EGB/mood';

const seasonRibbon = [
  { slug: 'spring', name: 'Spring', file: 'spring-sun-stone.png' },
  { slug: 'summer', name: 'Summer', file: 'summer-sun-stone.png' },
  { slug: 'autumn', name: 'Autumn', file: 'autumn-sun-stone.png' },
  { slug: 'winter', name: 'Winter', file: 'winter-sun-stone.png' },
] as const;

const moodBoard = [
  { id: 'field-notes', src: `${MOOD_IMG}/mood-01.jpg`, label: 'Field notes', alt: 'Old books, wire spectacles, and yellow wildflowers' },
  { id: 'root-light', src: `${MOOD_IMG}/mood-02.jpg`, label: 'Root-light', alt: 'Hand glowing with green natural magic' },
  { id: 'verdamere-cloth', src: `${MOOD_IMG}/mood-03.jpg`, label: 'Verdamere cloth', alt: 'Forest-green tunic with gold embroidery and vine-stitched sleeves' },
  { id: 'sigil-ink', src: `${MOOD_IMG}/mood-04.jpg`, label: 'Sigil ink', alt: 'Teal glass inkwell with dip pen on handwritten parchment' },
  { id: 'first-bloom', src: `${MOOD_IMG}/mood-05.jpg`, label: 'First bloom', alt: 'Soil-stained hand cradling a tomato flower' },
  { id: 'breath-of-green', src: `${MOOD_IMG}/mood-06.jpg`, label: 'Breath of green', alt: 'Glass lungs filled with birch leaves and twigs' },
  { id: 'window-boxes', src: `${MOOD_IMG}/mood-07.jpg`, label: 'Window boxes', alt: 'Grid of small potted succulents from above' },
  { id: 'forest-kit', src: `${MOOD_IMG}/mood-08.jpg`, label: 'Forest kit', alt: 'Leaf pouch, birch bark map, and crystal lantern on moss' },
] as const;

export default function DahonEgbPage() {
  return (
    <main>
      <div className="petal-field" aria-hidden="true">
        <span className="petal petal-a" />
        <span className="petal petal-b" />
        <span className="petal petal-c" />
        <span className="petal petal-d" />
        <span className="petal petal-e" />
        <span className="petal petal-f" />
      </div>

      <header className="header">
        <a className="crest" href="#top">
          <span>DA</span>
        </a>
        <nav>
          <a href="#application">Application</a>
          <a href="#overview">Overview</a>
          <a href="#services">Services</a>
          <a href="#magic">Magic</a>
          <a href="#history">History</a>
          <a href="#relations">Relations</a>
        </nav>
        <a className="shop-link" href="#services">
          The Verdant Remedy
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-layout">
          <div className="hero-visual">
            <div className="hero-sun" aria-hidden="true" />
            <div className="hero-frame">
              <img
                src={PORTRAIT}
                alt="Dahon Abre, a green haired elf in an olive and rose traveling outfit"
              />
            </div>
            <blockquote className="hero-quote">
              &ldquo;If I can make myself useful enough, perhaps that will be the same as knowing who I
              am.&rdquo;
            </blockquote>
          </div>
          <div className="hero-panel">
            <p className="kicker">House Abre · Verdamere → Evermere</p>
            <h1>
              Dahon <em>Abre</em>
            </h1>
            <p className="hero-role">Plant doctor · Verdamere apothecary · First son of House Abre</p>
            <p className="hero-desc">
              Newly settled in Evermere at Duke Theodore&apos;s invitation. The Verdant Remedy sells
              spring teas, season stones, and plant doctoring while the Grand Bazaar comes back.
            </p>
            <div className="facts">
              <span>
                <b>28</b> years old
              </span>
              <span>
                <b>Spring 18</b> birthday
              </span>
              <span>
                <b>Evermere</b> (from Verdamere)
              </span>
              <span>
                <b>Elf</b>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mood-board" id="mood" aria-label="Aesthetic mood board">
        <div className="mood-board-head">
          <p className="kicker">Mood</p>
          <h2>
            Verdant
            <br />
            <em>remedy.</em>
          </h2>
        </div>
        <div className="mood-grid">
          {moodBoard.map((tile, index) => (
            <figure
              className={`mood-tile mood-tile-${(index % 4) + 1}`}
              key={tile.id}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tile.src} alt={tile.alt} loading="lazy" />
              <figcaption>{tile.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <div className="season-ribbon" aria-label="Season charms">
        <p className="season-ribbon-label">Season charms on the shelf</p>
        <div className="season-ribbon-track">
          {seasonRibbon.map((s) => (
            <a className={`season-chip season-${s.slug}`} href="#shop-catalog" key={s.slug}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${STONE_IMG}/${s.file}`} alt="" />
              <span>{s.name}</span>
            </a>
          ))}
        </div>
      </div>

      <section className="section application" id="application">
        <p className="kicker">Evermere Grand Bazaar · Written Application</p>
        <h2>
          Character
          <br />
          <em>information.</em>
        </h2>
        <p className="application-note">
          Written application for Evermere Grand Bazaar. Submitted during Duke Theodore&apos;s
          restoration effort.
        </p>
        <dl className="application-grid">
          <div>
            <dt>❖ Name</dt>
            <dd>{application.name}</dd>
          </div>
          <div>
            <dt>❖ Age</dt>
            <dd>{application.age}</dd>
          </div>
          <div>
            <dt>❖ Birthday</dt>
            <dd>
              {application.birthday}{' '}
              <small>(Seasonal Calendar — 4 seasons, 30 days each; 1 Evermere day ≈ 3 IRL days)</small>
            </dd>
          </div>
          <div>
            <dt>❖ Occupation / Business</dt>
            <dd>{application.occupation}</dd>
          </div>
          <div>
            <dt>❖ Residence</dt>
            <dd>{application.residence}</dd>
          </div>
          <div>
            <dt>❖ Race</dt>
            <dd>{application.race}</dd>
          </div>
          <div className="application-wide">
            <dt>❖ Skills</dt>
            <dd>
              <p>
                <strong>Magic:</strong> {skillsByCategory.magic.join('; ')}
              </p>
              <p>
                <strong>Work-related:</strong> {skillsByCategory.work.join('; ')}
              </p>
              <p>
                <strong>Hobbies:</strong> {skillsByCategory.hobbies.join('; ')}
              </p>
            </dd>
          </div>
          <div className="application-wide">
            <dt>❖ Background</dt>
            <dd>{application.background}</dd>
          </div>
          <div className="application-wide">
            <dt>❖ Personality</dt>
            <dd>{application.personality}</dd>
          </div>
          <div className="application-wide">
            <dt>❖ Design Notes</dt>
            <dd>
              <ul className="design-notes">
                <li>
                  <strong>Height:</strong> {application.designNotes.height}
                </li>
                <li>
                  <strong>Weight / build:</strong> {application.designNotes.weight}; {application.designNotes.build}
                </li>
                <li>
                  <strong>Hair:</strong> {application.designNotes.hair}
                </li>
                <li>
                  <strong>Eyes:</strong> {application.designNotes.eyes}
                </li>
                <li>
                  <strong>Skin &amp; ears:</strong> {application.designNotes.skin}; {application.designNotes.ears}
                </li>
                <li>
                  <strong>Usual clothing:</strong> {application.designNotes.clothing}
                </li>
                <li>
                  <strong>Scars:</strong> {application.designNotes.scars}
                </li>
                <li>
                  <strong>Notable traits:</strong> {application.designNotes.notable}
                </li>
              </ul>
            </dd>
          </div>
        </dl>
      </section>

      <section className="section overview" id="overview">
        <p className="kicker">Character Overview</p>
        <div className="trait-strip">
          <div>
            <span>Temperament</span>
            <strong>Attentive and gracious</strong>
          </div>
          <div>
            <span>Greatest strength</span>
            <strong>Dependable under pressure</strong>
          </div>
          <div>
            <span>Greatest flaw</span>
            <strong>Always finds one more task</strong>
          </div>
          <div>
            <span>Private hope</span>
            <strong>To choose something for himself</strong>
          </div>
        </div>
      </section>

      <section className="section shop" id="services">
        <div className="shop-sign">
          <span>New in Evermere · Awaiting the Grand Bazaar</span>
          <h2>The Verdant Remedy</h2>
          <p>Plant doctor · Season stones · Field magic · Spring teas</p>
        </div>
        <p className="shop-intro">
          Walk-ins welcome for sick plants, shelf stock, field magic, and steward&apos;s counsel.
        </p>
        <div className="shop-catalog" id="shop-catalog">
          <p className="eyebrow">Shelf stock</p>
          <div className="shop-catalog-grid">
            {shelfItems.map((item) => (
              <article
                className={`shop-product${item.seasonSlug ? ` season-${item.seasonSlug}` : ''}`}
                key={item.id}
              >
                <ShopProductImage
                  name={item.name}
                  image={item.image}
                  imageFile={item.imageFile}
                  categoryLabel={item.categoryLabel}
                />
                <div className="shop-product-body">
                  <p className="shop-product-category">{item.categoryLabel}</p>
                  <div className="shop-product-head">
                    <h4>{item.name}</h4>
                    <span>{item.price}</span>
                  </div>
                  <p className="shop-product-stock">Available / in stock</p>
                  <p className="shop-product-blurb">{item.blurb}</p>
                  <p className="shop-product-tags">
                    {item.tags.map((tag) => `#${tag}`).join(' ')}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="shop-catalog shop-services" id="shop-services">
          <p className="eyebrow">Field services</p>
          <p className="shop-catalog-note">
            Consultations, wards, song-work, and custom sigils—booked at the counter or by
            appointment.
          </p>
          <div className="shop-catalog-grid">
            {serviceItems.map((item) => (
              <article className="shop-product service" key={item.id}>
                <ShopProductImage
                  name={item.name}
                  image={item.image}
                  imageFile={item.imageFile}
                  categoryLabel={item.categoryLabel}
                />
                <div className="shop-product-body">
                  <p className="shop-product-category">{item.categoryLabel}</p>
                  <div className="shop-product-head">
                    <h4>{item.name}</h4>
                    <span>{item.price}</span>
                  </div>
                  <p className="shop-product-stock">{item.stockLabel}</p>
                  <p className="shop-product-blurb">{item.blurb}</p>
                  <p className="shop-product-tags">
                    {item.tags.map((tag) => `#${tag}`).join(' ')}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <p className="notice">
          Season stones lose charge over time. Dahon renews them and shows proper placement with every sale.
        </p>
        <p className="asset-credit shop-asset-credit">
          Item and stone icons from{' '}
          <em>Atelier Yumia: The Alchemist of Memories &amp; the Envisioned Land</em> (Gust / Koei
          Tecmo) via{' '}
          <a
            href="https://www.spriters-resource.com/pc_computer/atelieryumiathealchemistofmemoriestheenvisionedland/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Spriters Resource
          </a>
          .
        </p>
      </section>

      <section className="section magic" id="magic">
        <div className="magic-head">
          <p className="kicker">Earth Affinity</p>
          <h2>
            How the work
            <br />
            <em>holds up.</em>
          </h2>
          <p>
            Uncommon natural magic—learned earth craft, sigils, runes, and Viridienne song. Shelf
            stock and field services are both in the shop catalog above.
          </p>
        </div>
        <div className="magic-note">
          <strong>Limits &amp; rules</strong>
          <div>
            <p>
              Earth affinity only; UAMG-compliant workings. Season stones handle timing on the
              shelf. Consultations, wards, pockets, and commissions are booked through the counter.
            </p>
            <p>
              Wide song-work and heavy sigil chains exhaust him quickly—the blight scar on his left
              palm darkens when he overtaxes himself or touches badly corrupted mana.
            </p>
          </div>
        </div>
      </section>

      <section className="section personality">
        <p className="kicker">Personality</p>
        <h2>
          Easy to like.
          <br />
          <em>Difficult to know.</em>
        </h2>
        <div className="preferences">
          {(
            [
              ['Likes', 'Annotated books, mild tea, organized shelves, fresh soil, seed exchanges, embroidery, quiet company, and invitations that do not involve work.'],
              ['Dislikes', 'Careless magic, wasted seeds, unexplained wilt, public conflict, being ordered to rest, and anyone treating Lluem as a title instead of a child.'],
              ['Hidden side', 'Dry humor, harmless gossip, fierce board game competition, and a soft singing voice he hates hearing praised.'],
              ['Central struggle', 'Figuring out whether anyone wants him around for himself.'],
            ] as const
          ).map(([n, t]) => (
            <div key={n}>
              <span>{n}</span>
              <p>{t}</p>
            </div>
          ))}
        </div>
      </section>

      <aside className="journal-scrap" aria-label="Field journal scrap">
        <div className="journal-scrap-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${MOOD_IMG}/mood-05.jpg`}
            alt="Soil-stained hand cradling a tomato flower"
          />
        </div>
        <div className="journal-scrap-body">
          <p className="journal-scrap-mark">Torn from a field book · Spring 18</p>
          <blockquote>
            Healthy roots do not announce themselves. They simply hold. The work is noticing when they
            stop.
          </blockquote>
          <p className="journal-scrap-sign">— D. Abre</p>
        </div>
      </aside>

      <section className="section history" id="history">
        <div className="history-title">
          <p className="kicker">House Abre</p>
          <h2>
            Roots cut back
            <br />
            <em>grow differently.</em>
          </h2>
        </div>
        <div className="timeline">
          <article>
            <span>01</span>
            <div>
              <h3>The First Son</h3>
              <p>
                House Abre passes authority from mother to daughter. Because Dahon&apos;s parents
                struggled for years to conceive another child, he was raised as the foundation beneath
                an uncertain succession—the one who holds things together while his sister grows into
                the heirship.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Lluem Is Born</h3>
              <p>
                Dahon was nineteen when his sister Lluem was born. Her arrival gave the house its heir
                and his obligations a name. He adores her and wants her to have a childhood before
                inheritance consumes it.
              </p>
            </div>
          </article>
          <article className="blight">
            <span>03</span>
            <div>
              <h3>The Hollowroot Blight</h3>
              <p>
                Six years ago, a magical disease spread beneath the Abre estate in Verdamere. Plants
                looked fine above ground while the mana in their roots vanished. It traveled through
                connected soil and wore down anyone working the beds too long. Many relatives,
                gardeners, retainers, and scholars died containing it.
              </p>
            </div>
          </article>
          <article>
            <span>04</span>
            <div>
              <h3>The Scar</h3>
              <p>
                An infected root pierced Dahon&apos;s left palm. His aunt sealed the contamination
                with an emergency sigil before it could spread, spending the last of her mana to save
                him. The branching scar still darkens when he overtaxes himself or touches badly
                corrupted mana.
              </p>
            </div>
          </article>
          <article>
            <span>05</span>
            <div>
              <h3>The Poster</h3>
              <p>
                One year after the Great War ended, Duke Theodore—young son of the duke who fell in
                the conflict—sent recruitment posters across Verdanys. The Grand Bazaar had closed;
                Evermere had lost trade, tourism, and much of its bond with the four season villages.
                Dahon wrote his application and was welcomed: &ldquo;Welcome to Evermere, partner.&rdquo;
              </p>
            </div>
          </article>
          <article>
            <span>06</span>
            <div>
              <h3>Evermere</h3>
              <p>
                Dahon is setting up The Verdant Remedy, rebuilding House Abre&apos;s ties to Evermere
                and the season villages, and studying plants from Verdamere, Solmere, Aemere, and
                Frostmere. He wants to know what caused the blight and how to stop it from returning.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="section relations" id="relations">
        <p className="kicker">Social Menu</p>
        <h2>
          Residents
          <br />
          <em>he keeps close.</em>
        </h2>
        <p className="relations-note">
          Bonds kept the way a farmer keeps a social ledger — hearts for closeness, faces for the
          people he will not lose track of.
        </p>
        <div className="social-menu" role="list">
          <div className="social-menu-title">
            <span aria-hidden="true">♥</span>
            Residents
            <span aria-hidden="true">♥</span>
          </div>
          <div className="social-rows">
            {relations.map((person, i) => (
              <article
                className={`social-row${i === 0 ? ' is-active' : ''}`}
                key={person.id}
                role="listitem"
              >
                <div className="social-row-main">
                  <div className="social-portrait">
                    {person.portrait ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={person.portrait} alt="" />
                    ) : (
                      <span className="social-portrait-fallback" aria-hidden="true">
                        {person.initials}
                      </span>
                    )}
                  </div>
                  <div className="social-meta">
                    <h3>{person.name}</h3>
                    <p className="social-status">({person.status})</p>
                    <div className="social-icons" aria-hidden="true">
                      <span className="social-icon talk" title="Talk" />
                      <span className="social-icon gift" title="Gift" />
                    </div>
                  </div>
                  <div className="social-meters" aria-label={`${person.hearts} of 10 hearts`}>
                    <div className="heart-row">
                      {Array.from({ length: 10 }, (_, h) => (
                        <span
                          className={`heart${h < person.hearts ? ' is-filled' : ''}`}
                          key={h}
                          aria-hidden="true"
                        >
                          ♥
                        </span>
                      ))}
                    </div>
                    <p className="social-role">{person.role}</p>
                  </div>
                </div>
                <p className="social-blurb">{person.blurb}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section trivia">
        <div className="trivia-portrait">
          <img src={PORTRAIT} alt="" />
        </div>
        <div>
          <p className="kicker">Field Notes</p>
          <h2>
            Little things,
            <br />
            <em>quietly noticed.</em>
          </h2>
          <ul>
            {trivia.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer>
        <div className="footer-mark">
          <span>DA</span>
        </div>
        <div>
          <strong>Dahon Abre</strong>
          <small>The Verdant Remedy · Evermere</small>
          <p className="asset-credit footer-asset-credit">
            Background art from{' '}
            <em>Atelier Yumia: The Alchemist of Memories &amp; the Envisioned Land</em> (Gust /
            Koei Tecmo).{' '}
            <a
              href="https://www.spriters-resource.com/pc_computer/atelieryumiathealchemistofmemoriestheenvisionedland/asset/509722/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Spriters Resource
            </a>
          </p>
        </div>
        <a href="#top">Return to top ↑</a>
      </footer>
    </main>
  );
}
