const seasons = [
  ["Spring", "SPR", "Vernal Quickening", "Blesses seeds with the gentle conditions of early spring, encouraging germination and healthy new roots even when the surrounding season is less welcoming."],
  ["Summer", "SUM", "Sunwarm Stone", "Stores a measured warmth that helps heat loving crops ripen. The enchantment cannot replace sunlight and must be renewed as its mana fades."],
  ["Autumn", "AUT", "Harvest Grace", "Supports a plant through its final ripening and helps it devote its remaining strength toward fruit, grain, spice, or seed of dependable quality."],
  ["Winter", "WIN", "Winterkeeping", "Encourages dormancy, slows spoilage, and protects hardy roots from ordinary cold. It cannot save a delicate crop from severe frost on its own."],
];

const skills = [
  ["Botanical Guidance", "Natural Magic", "Guides roots, supports germination, strengthens damaged stems, and encourages plants along processes already natural to them."],
  ["Season Stones", "Runic Enchantment", "Imbues prepared stones with a mild seasonal influence. A stone supports a small planter or garden bed and gradually loses its charge."],
  ["Out of Season Blessing", "Sigil and Song", "Creates a temporary pocket of favorable growing conditions. It makes difficult cultivation possible, not effortless, and demands attentive care."],
  ["Garden Wards", "Sigils and Runes", "Protects plots from pests, exposes disturbances in soil mana, regulates moisture, and helps isolate disease before it spreads."],
  ["Earthen Shaping", "Natural Magic", "Moves loose earth, improves soil structure, stabilizes slopes, and raises small barriers for defense or fieldwork."],
  ["Viridienne Hymns", "Song Magic", "Traditional Abre growing songs calm distressed plants and reinforce cultivated land. Wide workings exhaust him quickly."],
];

const relations = [
  ["Lluem Abre", "Younger sister and heir", "Dahon's nine year old sister and the future matriarch of House Abre. He acts as brother, tutor, protector, and sometimes nearly a third parent. Lluem would prefer he stop hiding every difficulty from her."],
  ["Lady Mireille Abre", "Mother and head of house", "A capable, demanding matriarch who trusts Dahon with the family's most sensitive work. Their love is real, though much of it has always been expressed through duty and expectation."],
  ["The Abre Household", "Family and dependents", "The surviving relatives, retainers, gardeners, and workers who rely upon House Abre. Dahon considers each of them his responsibility, whether they asked him to or not."],
  ["Theodore of Evermere", "Duke and professional allegiance", "Dahon supports the effort to restore Evermere and the Grand Bazaar. His participation represents House Abre's renewed commitment to the region."],
];

const trivia = [
  "He smooths his sleeves when anxious and offers tea whenever he does not know what else to say.",
  "He hums growing songs while concentrating, then becomes embarrassed if anyone admits they heard him.",
  "His field satchel contains chalk, pruning scissors, seed envelopes, string, and far too many notebooks.",
  "He is unexpectedly competitive at board games and botanical trivia.",
  "Lluem sends him drawings, complaints about tutors, and strict reminders to eat dinner. He keeps every letter.",
  "He checks nearby plants for signs of illness without realizing he is doing it.",
];

const Divider = () => <div className="divider" aria-hidden="true"><span>◆</span><i/><span>❧</span><i/><span>◆</span></div>;

export default function Home() {
  return <main>
    <header className="header"><a className="crest" href="#top"><span>DA</span></a><nav><a href="#overview">Overview</a><a href="#services">Services</a><a href="#magic">Magic</a><a href="#history">History</a><a href="#relations">Relations</a></nav><a className="shop-link" href="#services">The Verdant Remedy</a></header>

    <section className="hero" id="top">
      <div className="ghost-word">ABRE</div>
      <div className="hero-copy"><p className="eyebrow">House Abre · Verdamere Spring</p><h1>Dahon <em>Abre</em></h1><p className="role">Botanical mage, practical adviser, dutiful first son.</p><blockquote>“If I can make myself useful enough, perhaps that will be the same as knowing who I am.”</blockquote><div className="facts"><span><b>28</b> years</span><span><b>Spring 18</b> birthday</span><span><b>Earth</b> affinity</span><span><b>Elf</b> race</span></div></div>
      <div className="portrait"><div className="halo"/><img src="/dahon_EGB.png" alt="Dahon Abre, a green haired elf in an olive and rose traveling outfit"/><div className="portrait-label"><span>First son</span><strong>of House Abre</strong></div></div>
    </section>

    <section className="section overview" id="overview"><p className="kicker">Character Overview</p><div className="two-col"><div><h2>Wanted for more than<br/><em>what he can provide.</em></h2><Divider/></div><div className="prose dropcap"><p>Dahon is the first child and only son of Lady Mireille Abre, head of an old matriarchal elven house known for botanical scholarship and plant focused earth magic. He was raised to preserve the family, support its future matriarch, and solve whatever problems found their way to his door.</p><p>Gentle, observant, and almost painfully accommodating, Dahon has spent so long becoming what other people need that he has little sense of who he is without a duty attached. His work in Evermere is useful to his family. It may also be his first real chance to build a life that belongs to him.</p></div></div><div className="trait-strip"><div><span>Temperament</span><strong>Attentive and gracious</strong></div><div><span>Greatest strength</span><strong>Dependable under pressure</strong></div><div><span>Greatest flaw</span><strong>Cannot stop being useful</strong></div><div><span>Private hope</span><strong>To choose something for himself</strong></div></div></section>

    <section className="section shop" id="services"><div className="shop-sign"><span>Est. in Evermere</span><h2>The Verdant Remedy</h2><p>Botanical care · Seasonal enchantment · Practical counsel</p></div><div className="two-col shop-grid"><div><p className="eyebrow">More than a plant shop</p><h3>Bring him a failing crop, an unruly ledger, or a household held together with string.</h3><p className="body-copy">The Verdant Remedy serves farmers and gardeners, but it is also a quiet advisory office. Dahon draws on years of aristocratic stewardship to help ordinary residents and new merchants create routines that actually work.</p></div><div className="ledger">
      {[ ["Plant Care","Disease diagnosis, soil restoration, crop planning, seed preservation, protective wards, and care for magically sensitive plants."], ["Seasonal Enchantment","Season stones, growing blessings, frost protections, ripening charms, and small wards for planters, beds, or greenhouse plots."], ["Business Counsel","Stock organization, pricing review, sustainable schedules, record keeping, displays, customer care, and preparation for bazaar days."], ["Household Stewardship","Budgets, pantry planning, purchasing, staff routines, correspondence, guest etiquette, and the seasonal needs of a busy home."] ].map(([n,t],i)=><article key={n}><span>0{i+1}</span><div><h4>{n}</h4><p>{t}</p></div></article>)}</div></div><p className="notice">Dahon provides advice, careful enchantment, and conventional herbal preparations. He does not practice forbidden alchemy, guarantee profit, or replace the care a living plant still requires.</p></section>

    <section className="section magic" id="magic"><div className="magic-head"><p className="kicker">Earth Affinity</p><h2>A little season,<br/>held in <em>stone.</em></h2><p>Dahon cannot create life from nothing or command a plant against its nature. Instead, he gives it a gentler path toward something it was already capable of becoming.</p></div><div className="season-grid">{seasons.map(([season,mark,title,text])=><article className={`season ${season.toLowerCase()}`} key={season}><div className="stone"><span>{mark}</span></div><p className="season-name">{season} enchantment</p><h3>{title}</h3><div className="ornament">✦ ❧ ✦</div><p>{text}</p></article>)}</div><div className="magic-note"><strong>How out of season growing works</strong><p>A prepared season stone influences only a small area and cannot fully replace weather, sunlight, water, soil, or skilled care. With a compatible crop and attentive grower, it can extend a season, protect a delicate planting, or coax a modest harvest where one would normally be impossible. Powerful results require several stones, linked sigils, and regular renewal.</p></div><div className="skill-list">{skills.map(([name,form,text])=><article key={name}><div><span>{form}</span><h3>{name}</h3></div><p>{text}</p></article>)}</div></section>

    <section className="section personality"><div className="profile-card"><span className="roman">I</span><p className="eyebrow">Personality</p><h2>Easy to like.<br/><em>Difficult to know.</em></h2><p>Dahon remembers small details and quietly uses them to make others comfortable. His kindness is sincere, but tangled with the belief that affection must be earned through usefulness.</p><p>He rarely expresses anger, almost never refuses a direct request, and hides exhaustion until it makes him slower. Beneath that mildness is a stubborn streak. Once he claims something as his responsibility, he is terribly hard to move.</p></div><div className="preferences">{[["Likes","Annotated books, mild tea, organized shelves, fresh soil, seed exchanges, embroidery, quiet company, and invitations that do not involve work."],["Dislikes","Careless magic, wasted seeds, unexplained symptoms, public conflict, being ordered to rest, and anyone treating Lluem as a title rather than a child."],["Hidden side","Dry humor, harmless gossip, fierce board game competition, and a soft singing voice he does not want complimented."],["Central struggle","Learning that his value does not depend upon constant sacrifice and that being wanted is different from being needed."]].map(([n,t])=><div key={n}><span>{n}</span><p>{t}</p></div>)}</div></section>

    <section className="section history" id="history"><div className="history-title"><p className="kicker">House Abre</p><h2>Roots cut back<br/><em>grow differently.</em></h2></div><div className="timeline">
      <article><span>01</span><div><h3>The First Son</h3><p>House Abre passes authority from mother to daughter. Because Dahon's parents struggled for years to conceive another child, he was raised as the foundation beneath an uncertain succession, never the heir but always responsible for preserving what she would inherit.</p></div></article>
      <article><span>02</span><div><h3>Lluem Is Born</h3><p>Dahon was nineteen when his sister Lluem was born. Her arrival gave the house its heir and his obligations a name. He adores her and wants her to have a childhood before inheritance consumes it.</p></div></article>
      <article className="blight"><span>03</span><div><h3>The Hollowroot Blight</h3><p>Six years ago, a magical disease spread beneath the Abre estate. Plants remained outwardly healthy while the mana inside their roots vanished. It crossed connected soil and caused fatal mana exhaustion in those repeatedly exposed. Many relatives, gardeners, retainers, and scholars died while containing it.</p></div></article>
      <article><span>04</span><div><h3>The Scar</h3><p>An infected root pierced Dahon's left palm. His aunt sealed the contamination before it could spread, spending the last of her mana to save him. The branching scar still darkens when he overtaxes himself or touches badly corrupted mana.</p></div></article>
      <article><span>05</span><div><h3>Evermere</h3><p>The revived Grand Bazaar offers House Abre new alliances and gives Dahon access to plants from four eternal seasons. He hopes their different magical conditions will reveal what caused the blight and how to stop it from ever returning.</p></div></article>
    </div></section>

    <section className="section relations" id="relations"><p className="kicker">Important Connections</p><h2>The people around<br/><em>his place in the world.</em></h2><div className="relation-list">{relations.map(([name,role,text],i)=><article key={name}><span>{String(i+1).padStart(2,"0")}</span><div><h3>{name}</h3><p className="relation-role">{role}</p></div><p>{text}</p></article>)}</div></section>

    <section className="section trivia"><div className="trivia-portrait"><img src="/dahon_EGB.png" alt=""/></div><div><p className="kicker">Field Notes</p><h2>Little things,<br/><em>quietly noticed.</em></h2><ul>{trivia.map(x=><li key={x}>{x}</li>)}</ul></div></section>
    <footer><div className="footer-mark"><span>DA</span></div><div><strong>Dahon Abre</strong><small>The Verdant Remedy · Evermere Grand Bazaar</small></div><a href="#top">Return to top ↑</a></footer>
  </main>;
}
