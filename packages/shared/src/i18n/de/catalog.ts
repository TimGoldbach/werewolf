import type { CatalogTexts } from '../types.js'

export const catalog: CatalogTexts = {
  roles: {
    werewolf: {
      name: 'Der einfache Werwolf',
      aliases: ['Werwolf'],
      description:
        'Das Rudel erwacht und einigt sich auf ein Opfer. Niemals einen Werwolf fressen.',
    },
    'accursed-wolf-father': {
      name: 'Der Urwolf',
      aliases: ['Wolfsvater'],
      description:
        'Einmal pro Partie kann der Urwolf das Opfer infizieren statt töten — es wird zum Werwolf (behält seine Sonderfähigkeit und ist vollwertiges Rudelmitglied).',
    },
    'big-bad-wolf': {
      name: 'Der große, böse Wolf',
      description:
        'Reißt nach dem Rudel allein ein zweites Opfer — solange noch kein Mitglied des Rudels gestorben ist.',
    },
    'alpha-female': {
      name: 'Das Alphaweibchen',
      aliases: ['Anführerin'],
      description:
        'Anführerin des Rudels. Überlebt den ersten Nachtangriff auf sich, darf einmal zusätzlich fressen und einmal jemanden infizieren — aber nicht beides in derselben Nacht.',
    },
    'lead-wolf': {
      name: 'Der Leitwolf',
      aliases: ['Urvater'],
      description:
        'Darf jede Nacht einen Spieler infizieren, bis das Rudel vollzählig ist (Anzahl vorher festgelegt). Infizierte verlieren ihre Sonderfähigkeiten.',
    },
    werebear: {
      name: 'Der Werbär',
      description:
        'Darf einmal zusätzlich zum Rudel seinen direkten Nachbarn fressen (tote Nachbarn werden übersprungen). Kann jede Rolle jeder Partei fressen.',
    },
    sharptooth: {
      name: 'Der Scharfzahn',
      description:
        'Kann einmal im Spiel einen Fraß unabwendbar machen — der betroffene Spieler kann durch nichts mehr gerettet werden.',
    },
    'wolf-shaman': {
      name: 'Der Wolfsschamane',
      description:
        'Vernebelt jede Nacht einen Wolf (auch sich selbst, aber nicht zweimal denselben). Der vernebelte Wolf bleibt sehenden Rollen verborgen — der Bär riecht ihn trotzdem.',
    },
    dog: {
      name: 'Der Hund',
      description:
        'Wählt beim Aufwachen eine Person, die diese Nacht keine Fähigkeit hat (wird aber zum Schein aufgerufen). Sonst normales Rudelmitglied.',
    },
    hypnotist: {
      name: 'Der Hypnotiseur',
      description:
        'Kennt die Wölfe (sie ihn nicht). Nennt zu Beginn der Nacht eine Person, die hypnotisiert durchschläft und keine Nachtaktion ausführen darf (nicht zweimal dieselbe).',
    },
    'mystic-wolf': {
      name: 'Der mystische Wolf',
      description:
        'Darf einmal im Spiel erfragen, wie viele nachtaktive Dorfrollen noch im Spiel sind. Sonst normales Rudelmitglied.',
    },
    werecrow: {
      name: 'Die Werkrähe',
      description:
        'Darf jede Nacht von einer Person erfragen, ob diese nachtaktiv ist. Sonst normales Rudelmitglied.',
    },
    'wolf-cub': {
      name: 'Das Wolfsjunge',
      aliases: ['Junior'],
      description:
        'Wird das Wolfsjunge getötet (egal wie), dürfen die Wölfe aus Zorn in der Folgenacht zwei Personen fressen. Das Rudel darf das Junge selbst nicht fressen.',
    },
    'plague-wolf': {
      name: 'Der Pestwolf',
      description:
        'Stirbt der Pestwolf beim Lynch, stirbt der Spieler, der ihn als erster nominiert hat, in der Folgenacht — zusätzlich zum normalen Fressen.',
    },
    'ghost-werewolf': {
      name: 'Der Geisterwerwolf',
      description:
        'Wacht normal mit dem Rudel auf und kann durch nichts getötet werden. Stirbt der letzte Wolf, stirbt er automatisch ebenfalls.',
    },
    'dream-wolf': {
      name: 'Der Traumwolf',
      description:
        'Erwacht erst mit dem Rudel, sobald ein anderer Wolf tot ist. Vorher kennt ihn niemand und er kennt die Wölfe nicht. Kann von den Wölfen nicht gefressen werden.',
    },
    stray: {
      name: 'Der Streuner',
      description:
        'Wird der Streuner von den Wölfen gefressen, wird er zum Günstling — ihm werden die Wölfe angezeigt. Die Wölfe wissen nichts von seiner Existenz.',
    },
    'wolf-in-sheeps-clothing': {
      name: 'Der Wolf im Schafspelz',
      description:
        'Normaler Wolf, der der Seherin und dem paranormalen Ermittler als „gut" und der Seherin mit schlechter Gabe als Dorfbewohner angezeigt wird. Nur der Bär erkennt ihn.',
    },
    sorceress: {
      name: 'Die Zaubermeisterin',
      description:
        'Spielt für die Wölfe (die sie nicht kennen) und wird von der Seherin als Dorfbewohnerin gesehen. Zeigt jede Nacht auf einen Spieler und erfährt, ob es die Seherin ist.',
    },
    minion: {
      name: 'Der Günstling',
      description:
        'Verräter am Dorf: lernt in der ersten Nacht die Wölfe kennen (und sie ihn), wacht danach aber NICHT mit dem Rudel auf und darf auch nicht mit abstimmen. Wird sehenden Rollen (außer Seherin mit schlechter Gabe) als Dorfbewohner angezeigt. Kann nicht allein gewinnen.',
    },
    'chosen-one': {
      name: 'Der Auserwählte',
      description:
        'Helfer der Wölfe: kennt sie und sie ihn. Stirbt der letzte Wolf, wird der Auserwählte selbst zum Wolf. (Variante: den Wölfen wird nicht verraten, ob Auserwählter oder Günstling.)',
    },
    warlock: {
      name: 'Der Warlock',
      description:
        'Wie der Günstling, zusätzlich darf er eine Person bestimmen, die sehenden Rollen als Wolf angezeigt wird (wie ein Lykantroph).',
    },
    'strawberry-girl': {
      name: 'Das Erdbeermädchen',
      description:
        'Größter Fan der Wölfe: kennt sie, sie sie aber nicht. Darf einmal Beeren vor eine Tür schmieren, sodass am Morgen dort eine falsche Blutlache entdeckt wird.',
    },
    'white-werewolf': {
      name: 'Der weiße Werwolf',
      aliases: ['Weißer Wolf'],
      description:
        'Jagt mit dem Rudel; jede zweite Nacht darf er zusätzlich allein einen Werwolf töten. Gewinnt nur als letzter Überlebender.',
    },
    villager: {
      name: 'Der einfache Dorfbewohner',
      aliases: ['Dorfbewohner'],
      description: 'Keine Sonderfähigkeit. Findet tagsüber die Werwölfe und schläft nachts fest.',
    },
    seer: {
      name: 'Die Seherin',
      aliases: ['Wahrsagerin'],
      description:
        'Überprüft jede Nacht die Gesinnung eines Spielers (Daumen hoch = pro Dorf/inkognito, Daumen runter = dagegen).',
    },
    'flawed-seer': {
      name: 'Die Seherin mit schlechter Gabe',
      description:
        'Sieht die konkrete Rolle, aber die Information wird dem GANZEN Dorf offenbart. Wolf im Schafspelz und Günstling erscheinen als Dorfbewohner, der Lykantroph als einfacher Wolf.',
    },
    'apprentice-seer': {
      name: 'Der Seherlehrling',
      description:
        'Übernimmt die Rolle der Seherin, sobald diese tot ist (erfährt es vom Spielleiter). Vorher weiß er nicht, wer die Seherin ist.',
    },
    eye: {
      name: 'Das Auge',
      description:
        'Hat eine geistige Verbindung zur Seherin und erfährt in der ersten Nacht, wer diese ist (aber nicht andersherum).',
    },
    cupid: {
      name: 'Amor',
      description:
        'Bestimmt in der ersten Nacht zwei Verliebte (darf sich selbst wählen). Stirbt einer, stirbt der andere aus Kummer mit. Gemischte Paare bilden eine Drittpartei.',
    },
    'wanton-cupid': {
      name: 'Die Amorschlampe',
      description:
        'Amor-Variante, die selbst jede Nacht bei einem anderen Spieler schläft (nicht zweimal hintereinander beim selben) und daher nicht zuhause ist. Schläft sie beim Wolfsopfer, sterben beide.',
    },
    'two-sisters': {
      name: 'Die zwei Schwestern',
      aliases: ['Schwestern'],
      description:
        'Erkennen sich in der ersten Nacht gegenseitig und wissen von der Rechtschaffenheit der anderen. Sie sterben nicht miteinander.',
    },
    freemasons: {
      name: 'Die Freimaurer',
      description:
        'Geheimbund, der sich in der ersten Nacht gegenseitig zeigt. Niemand außer dem Spielleiter darf das Wort „Freimaurer" verwenden oder darauf anspielen — sonst stirbt derjenige.',
    },
    companion: {
      name: 'Die Gesellschafterin',
      description:
        'Sucht sich in der ersten Nacht einen Freund aus, dem sie sich offenbart und ihre Gesellschaft aufzwingt. Stirbt der Freund, darf sie sich einen neuen suchen.',
    },
    witch: {
      name: 'Die Hexe',
      description:
        'Sieht nur das Rudelopfer (solange sie einen Trank hat). Hat je einen einmaligen Heil- und Gifttrank, beide auch in derselben Nacht einsetzbar.',
    },
    coven: {
      name: 'Der Hexenzirkel',
      description:
        'Zwei Hexen mit zusammen vier Tränken (eine „gute" mit zwei Heil-, eine „böse" mit zwei Gifttränken). Sie müssen sich über den Einsatz einig sein; die Tränke sind personengebunden.',
    },
    'herb-witch': {
      name: 'Die Kräuterhexe',
      description: 'Hexen-Variante mit nur einem Trank — sie darf wählen, ob Heil- oder Gifttrank.',
    },
    magician: {
      name: 'Der Magier',
      description:
        'Mächtiger als die Hexe: hat zwei beliebige Tränke zur Verfügung (Heil und/oder Gift).',
    },
    harlot: {
      name: 'Die Wanderhure',
      aliases: ['Waisenmädchen'],
      description:
        'Wählt beim Aufwachen jede Nacht eine Person, bei der sie nächtigt. Sie ist dann für die Werwölfe unantastbar, stirbt aber, wenn diese Person in derselben Nacht stirbt. Ist diese Person selbst ein Werwolf, fressen die Wölfe sie anstelle ihres gewählten Opfers (die Hexe kann sie heilen).',
    },
    vagabond: {
      name: 'Der Vagabund',
      description:
        'Sucht sich jede Nacht eine andere Bleibe. Schläft er bei einem Dorfbewohner, auf den eine Nachtaktion verübt wird, trifft sie stattdessen ihn. Wird er selbst angegriffen, passiert nichts (nicht zuhause).',
    },
    healer: {
      name: 'Der Heiler',
      aliases: ['Beschützer'],
      description:
        'Schützt jede Nacht eine Person (nicht zweimal hintereinander dieselbe, sich selbst erlaubt) gegen Wolfsbisse. Schützt NICHT vor Infizierung.',
    },
    bodyguard: {
      name: 'Der Leibwächter',
      description:
        'Schützt jede Nacht eine andere Person vor beliebigen Angriffen (nicht Infizierung), stirbt dabei aber selbst an ihrer Stelle. Ist nie zuhause, kann nicht gefressen (aber infiziert) werden.',
    },
    keeper: {
      name: 'Der Hüter',
      description:
        'Beschützt seine beiden direkten Sitznachbarn (Spielbeginn) vor allen tödlichen Nachtangriffen dorffeindlicher Rollen.',
    },
    'guardian-angel': {
      name: 'Der Schutzengel',
      description:
        'Sucht jede Nacht eine Person, die vor sämtlichen dorffeindlichen Angriffen geschützt ist (außer Infizierung). Schützt nur dorffreundliche Rollen.',
    },
    'patron-saint': {
      name: 'Der Schutzpatron',
      description:
        'Beschützt jede Nacht eine Person vor sämtlichen nächtlichen Angriffen (außer Infizierung) — unabhängig von deren Partei.',
    },
    'night-watchman': {
      name: 'Der Nachtwächter',
      description:
        'Solange er lebt, kann kein einfacher Dorfbewohner („Dorfbewohner" auf der Karte) von den Wölfen gefressen werden. Kein Schutz vor anderen tötenden Rollen oder Infizierung.',
    },
    druid: {
      name: 'Der Druide',
      description:
        'Bestimmt jede Nacht eine Person, die am folgenden Tag nicht gelyncht werden kann (nicht zweimal hintereinander dieselbe). Die Person weiß nichts davon.',
    },
    jailer: {
      name: 'Der Kerkermeister',
      description:
        'Sperrt jede Nacht eine Person ein (nicht zweimal hintereinander dieselbe), um sie zu schützen oder zu bestrafen. Auf/durch die eingesperrte Person kann keine Aktion ausgeführt werden.',
    },
    headmistress: {
      name: 'Die Schuldirektorin',
      description:
        'Bestimmt jede Nacht einen Spieler, der am nächsten Tag einmalig nicht abstimmen darf.',
    },
    mummy: {
      name: 'Die Mumie',
      description:
        'Wickelt jede Nacht eine Person ein (Bann hält bis zum Tod). Vor der Lynch-Abstimmung sagt die Mumie, wie sie stimmt — alle mumifizierten Personen müssen genauso stimmen.',
    },
    'saint-nicholas': {
      name: 'Der Nikolaus',
      description:
        'Sucht jede Nacht einen glücklichen Beschenkten aus (nicht zweimal hintereinander denselben) und verteilt Geschenke.',
    },
    'rune-reader': {
      name: 'Der Runenkundige',
      description:
        'Malt einmal im Spiel Runen an die Türen von drei Spielern. Die Wölfe können in dieser Nacht nur einen der drei fressen. Wählt er drei Wölfe, entfällt das Fressen.',
    },
    'mad-professor': {
      name: 'Der verrückte Professor',
      description:
        'Gibt jede Nacht einem anderen Spieler ein hochexplosives Gebräu (nicht zweimal hintereinander demselben). Stirbt der Professor, stirbt der aktuelle Gebräu-Besitzer ebenfalls.',
    },
    alchemist: {
      name: 'Der Alchemist',
      description:
        'Gibt vor der ersten Nacht ein Reagenzglas an einen Spieler, das jede Nacht weitergereicht wird. Stirbt der Alchemist, explodiert das Gebräu und tötet den aktuellen Besitzer.',
    },
    blacksmith: {
      name: 'Der Schmied',
      description:
        'Darf einmal im Spiel einen Dolch schmieden und einem Mitspieler schenken. Dieser darf in der darauffolgenden Nacht jemanden erdolchen.',
    },
    assassin: {
      name: 'Der Meuchelmörder',
      description: 'Darf einmal im Spiel (in der Nacht) jemanden erdolchen.',
    },
    inquisitor: {
      name: 'Der Inquisitor',
      description:
        'Darf jede Nacht einen Spieler foltern (muss nicht). Ist das Opfer ein Wolf, stirbt es; ist es kein Wolf, stirbt der Inquisitor. Foltert er die Hexe, stirbt die Hexe.',
    },
    hunter: {
      name: 'Der Jäger',
      description:
        'Stirbt der Jäger (egal wie), gibt er im letzten Atemzug einen Schuss ab und reißt einen beliebigen Spieler mit in den Tod (oder schießt in die Luft). Schützt zudem das Rotkäppchen.',
    },
    gunslinger: {
      name: 'Der Revolverheld',
      description: 'Der Waffennarr darf nach seinem Tod bis zu zwei Personen erschießen.',
    },
    bomber: {
      name: 'Der Attentäter',
      description:
        'Sobald der Attentäter stirbt, entscheidet er, ob er seine beiden Nachbarn, nur einen oder gar keinen mit in den Tod reißt.',
    },
    'exploding-kitten': {
      name: 'Das Exploding Kitten',
      description:
        'Explodiert, wenn es stirbt (egal wodurch), und nimmt seinen linken und rechten Nachbarn mit.',
    },
    'imploding-kitten': {
      name: 'Das Imploding Kitten',
      description:
        'Explodiert beim Tod (egal wie) und tötet beide Nachbarn — das Kitten selbst aber überlebt.',
    },
    elder: {
      name: 'Der Alte',
      aliases: ['Der Ahn', 'Der Älteste', 'Ältester'],
      description:
        'Überlebt den ersten Werwolf-Angriff (zwei Bisse nötig). Stirbt er durch Lynch/Gift/tötende Dorfrolle, verlieren alle Dorfbewohner ihre Sonderfähigkeiten.',
    },
    'tough-guy': {
      name: 'Der harte Bursche',
      description:
        'Besonders starker Dorfbewohner: überlebt den ersten Werwolfangriff (muss zweimal gefressen werden) und erfährt nicht, dass er angegriffen wurde.',
    },
    jeremiah: {
      name: 'Jeremias',
      description:
        'Überlebt den ersten Werwolfangriff. Bei diesem Angriff zeigt ihm eine göttliche Eingebung zufällig zwei Personen: einen Wolf und eine Pro-Dorf-Rolle.',
    },
    lycanthrope: {
      name: 'Der Lykantroph',
      description:
        'Wird allen sehenden Rollen als Wolf angezeigt, spielt aber auf Seiten des Dorfes.',
    },
    'little-red-riding-hood': {
      name: 'Rotkäppchen',
      description:
        'Wird nachts vom lebenden Jäger vor allen Wolfsangriffen geschützt (außer Infizierung). In der Nacht, in der der Jäger stirbt, entfällt der Schutz.',
    },
    rapunzel: {
      name: 'Rapunzel',
      description: 'Wird sie gefressen, verendet der gierigste der Wölfe an ihrem Haarknäuel mit.',
    },
    'rusty-sword-knight': {
      name: 'Der Ritter der rostigen Klinge',
      aliases: ['Ritter mit dem rostigen Schwert', 'Ritter'],
      description:
        'Wird er von Werwölfen gefressen, erkrankt der im Uhrzeigersinn nächste Werwolf und stirbt in der folgenden Nacht. Dem Dorf wird sein Tod nicht mitgeteilt.',
    },
    leper: {
      name: 'Die Aussätzige',
      description:
        'Wird sie gefressen, verderben sich die Wölfe den Magen und dürfen in der darauffolgenden Nacht nicht fressen.',
    },
    'fair-maiden': {
      name: 'Die holde Maid',
      description:
        'Wird sie von den Werwölfen gefressen, erfährt sie es und bestimmt einen anderen Spieler (beliebiger Partei), der an ihrer Stelle stirbt. Wird sie selbst geschützt, erfährt sie nichts.',
    },
    'bear-tamer': {
      name: 'Der Bärenführer',
      description:
        'Jeden Morgen brummt der Bär, wenn ein direkter (lebender) Sitznachbar ein Werwolf ist. Erkennt auch den Wolf im Schafspelz und vernebelte Wölfe. Braucht die Sitzordnung.',
    },
    fox: {
      name: 'Der Fuchs',
      description:
        'Zeigt auf einen Spieler; erfährt, ob in dessen Dreiergruppe (mit beiden Nachbarn) ein Werwolf ist. Wenn nein, verliert er die Fähigkeit.',
    },
    detective: {
      name: 'Der Detektiv',
      description:
        'Darf einmal im Spiel erfragen, ob zwei Personen im selben Team sind. Er darf sich nicht selbst erfragen.',
    },
    count: {
      name: 'Graf Zahl',
      description: 'Darf einmal im Spiel erfragen, wie viele böse Charaktere noch am Leben sind.',
    },
    'paranormal-investigator': {
      name: 'Der paranormale Ermittler',
      description:
        'Darf einmal im Spiel einen Spieler scannen und erfährt, ob unter ihm oder seinen beiden Nachbarn etwas Böses ist (Lykantroph böse, Wolf im Schafspelz gut, Drittparteien böse, Tote zählen nicht).',
    },
    'nosy-neighbor': {
      name: 'Der neugierige Nachbar',
      description:
        'Erfährt in der ersten Nacht die Gesinnung seiner beiden direkten Nachbarn (pro Dorf / pro Wolf). Lykantroph gilt als Wolf, Wolf im Schafspelz als pro Dorf.',
    },
    insomniac: {
      name: 'Der Schlaflose',
      description:
        'Bekommt jede Nacht vom Spielleiter gesagt, ob einer seiner direkten Nachbarn in der Nacht aktiv war.',
    },
    streetwalker: {
      name: 'Die Bordsteinschwalbe',
      description:
        'Erfragt jede Nacht einen Spieler und erfährt, ob dieser nachtaktiv ist oder nicht.',
    },
    medium: {
      name: 'Das Medium',
      description:
        'Darf jede Nacht über den Spielleiter einem ausgeschiedenen Spieler eine Ja/Nein-Frage stellen. Der Befragte muss nicht wahrheitsgemäß antworten.',
    },
    'little-owl': {
      name: 'Das Käuzchen',
      description:
        'Bekommt zum Ende der Nacht die sterbenden Spieler angezeigt und darf einmal im Spiel einen Tod um eine Nacht verschieben (nicht den eigenen). Danach wird ihm kein Toter mehr angezeigt.',
    },
    quack: {
      name: 'Der Quacksalber',
      description:
        'Bekommt alle Nachttoten angezeigt und darf einmal im Spiel einen von ihnen retten.',
    },
    martyr: {
      name: 'Die Märtyrerin',
      description:
        'Erwacht als Letzte und bekommt alle endgültigen Nachttoten gezeigt. Sie darf sich einmal für einen der Toten opfern — dann stirbt sie statt seiner. (Variante: auch bei der Lynchung.)',
    },
    phantom: {
      name: 'Das Phantom',
      description:
        'Zeigt sich jede Nacht einem anderen Bewohner des Dorfes (immer einem anderen, solange es eine Auswahl gibt).',
    },
    goethe: {
      name: 'Goethe',
      aliases: ['Dichter'],
      description:
        'Ruft jede Nacht eine Person auf, die den ganzen folgenden Tag ausschließlich in Reimen sprechen muss. Die Strafe für einen Verstoß legst du als Spielleiter vorab fest (z. B. Stimmrecht für diesen Tag).',
    },
    enchantress: {
      name: 'Die Beschwörerin',
      description:
        'Bestimmt jede Nacht eine Person, die am Folgetag in ihrer Kommunikation eingeschränkt ist (Varianten: Pantomime, Reime, Singen, Fremdsprache …). Verstoß führt letztlich zum Tod.',
    },
    'little-girl': {
      name: 'Das kleine Mädchen',
      description:
        'Darf während der Werwolf-Phase heimlich blinzeln. Wird es erwischt, kann es anstelle des Opfers gefressen werden.',
    },
    mayor: {
      name: 'Der Bürgermeister',
      aliases: ['Hauptmann'],
      description:
        'Vom Dorf gewählt; seine Stimme zählt doppelt und er entscheidet Gleichstände. Stirbt er, bestimmt er den Nachfolger.',
    },
    king: {
      name: 'Der König',
      description:
        'Entgeht einmal dem Lynch (Rolle wird nicht offenbart). In der ZWEITEN Nacht sucht er sich eine Königin, die denselben einmaligen Lynchschutz erhält (weiß nichts davon) — in anderen Nächten diesen Schritt überspringen.',
    },
    prince: {
      name: 'Der Prinz',
      description:
        'Soll er gelyncht werden, werfen sich seine Leibwächter dazwischen und er überlebt. Beim zweiten Versuch kann der Prinz gelyncht werden.',
    },
    idiot: {
      name: 'Der Idiot',
      description:
        'Will unbedingt Blut sehen und stimmt bei jeder Abstimmung für den Tod des Angeklagten. Darf in der ersten Runde nicht geoutet werden. Muss mit der Pazifistin gespielt werden.',
    },
    pacifist: {
      name: 'Die Pazifistin',
      description:
        'Stimmt bei jeder Abstimmung für das Überleben des Angeklagten und darf selbst niemanden nominieren. Darf in der ersten Runde nicht geoutet werden. Muss mit dem Idioten gespielt werden.',
    },
    'village-idiot': {
      name: 'Der Dorfdepp',
      description:
        'Soll er gelyncht werden, erkennt das Dorf im letzten Moment den Depp und sieht von der Lynchung ab — er verliert aber für den Rest des Spiels sein Stimmrecht. Infiziert kann er nicht gelyncht werden.',
    },
    troublemaker: {
      name: 'Die Unruhestifterin',
      description:
        'Kann einmal im Spiel dafür sorgen, dass das Dorf am folgenden Tag zwei Menschen lyncht: Es gibt nur eine Abstimmung, und die beiden Personen mit den meisten Stimmen sterben.',
    },
    barkeeper: {
      name: 'Der Schankwart',
      description:
        'Verliert das Dorf ein wichtiges Mitglied, nüchtern alle Dörfler eine Nacht aus — in der folgenden Nacht können keine Pro-Dorf-Nachtaktionen ausgeführt werden.',
    },
    brewer: {
      name: 'Der Bierbrauer',
      description:
        'Leichenschmaus: Stirbt der Bierbrauer, plündert das Dorf seinen Keller. Am folgenden Tag wird auf Kommando gleichzeitig abgestimmt — niemand darf taktieren oder sich umentscheiden.',
    },
    bogeyman: {
      name: 'Das Schreckgespenst',
      description:
        'Stirbt es durch das Dorf, infiziert es aus Rache einen Dorfbewohner mit dem Werwolfvirus. Dieser neue Wolf muss einen Mitwolf fressen, sodass das Rudel gleich stark bleibt.',
    },
    'wild-child': {
      name: 'Das wilde Kind',
      aliases: ['Mogli'],
      description:
        'Wählt in der ersten Nacht ein Vorbild. Stirbt das Vorbild, wird das wilde Kind zum vollwertigen Werwolf.',
    },
    'wolf-hound': {
      name: 'Der Wolfshund',
      description: 'Entscheidet sich in der ersten Nacht endgültig: Dorfbewohner oder Werwolf.',
    },
    cursed: {
      name: 'Der Verfluchte',
      description:
        'Gewinnt mit dem Dorf, bis er gefressen werden soll — dann stirbt er nicht, sondern wird zum Werwolf. Wird er infiziert, wird er ebenfalls zum Wolf. Der Hexe wird er nicht als Wolfsopfer angezeigt.',
    },
    thief: {
      name: 'Der Dieb',
      description:
        'Stiehlt sich zu Spielbeginn die Rolle eines beliebigen Spielers und übernimmt sie. Der beklaute Spieler wird zum Dorfbewohner. (Variante: er erfährt nichts davon.)',
    },
    doppelganger: {
      name: 'Der Doppelgänger',
      description:
        'Wählt in der ersten Nacht eine Person und übernimmt sofort deren Rolle (die es dann doppelt gibt). Wird als „der Doppelgänger" geweckt, nicht als seine Rolle.',
    },
    'devoted-maid': {
      name: 'Die ergebene Magd',
      description:
        'Darf einmal im Spiel die Rolle eines gerade gelynchten Spielers übernehmen. Sie erfährt die Rolle erst, nachdem sie sie übernommen hat.',
    },
    toady: {
      name: 'Der Schleimer',
      description:
        'Anfangs neutral. Nimmt in dem Moment, in dem der Tod des ersten Spielers verkündet wird, dessen Identität an. Die Rolle des toten Spielers wird als „Schleimer" aufgedeckt.',
    },
    ghost: {
      name: 'Der Geist',
      description:
        'Der erste Tote des Spiels wird zum Geist und gewinnt weiterhin mit seiner Partei. Er kennt danach alle Rollen und schreibt nachts einen Buchstaben auf eine Tafel (keine Namen).',
    },
    admirer: {
      name: 'Die Schwärmerin',
      description:
        'Verliebt sich in die erste nachtaktive Rolle, die eine Aktion auf sie ausübt. Das neue Paar existiert parallel zu Amors Verliebten; auch eine Dreiecksbeziehung ist möglich.',
    },
    drunk: {
      name: 'Der Trunkenbold',
      description:
        'Liegt bis zur dritten Nacht betrunken unter dem Tisch und bekommt nichts mit. Erst dann erfährt er seine Rolle vom Spielleiter. Bis dahin spielt und gewinnt er mit dem Dorf.',
    },
    'pied-piper': {
      name: 'Der Flötenspieler',
      aliases: ['Rattenfänger'],
      description:
        'Betört am Ende jeder Nacht zwei Spieler (bei ≤15 Lebenden einen). Gewinnt allein, sobald alle noch Lebenden betört sind.',
    },
    angel: {
      name: 'Der Engel',
      description:
        'Bei ihm beginnt das Spiel mit einem Tag VOR der ersten Nacht. Gewinnt sofort, wenn er in der ersten Runde ausscheidet — sonst normaler Dorfbewohner.',
    },
    'serial-killer': {
      name: 'Der Serienkiller',
      description:
        'Tötet jede Nacht eine Person. Gewinnt, wenn er als einziger überlebt. Kann Wölfe umbringen und selbst von Wölfen gefressen werden.',
    },
    vampire: {
      name: 'Der Vampir',
      description:
        'Beißt jede Nacht eine Person — sie stirbt, sobald am nächsten Tag die erste Nominierung erfolgt (sonst bei der ersten Nominierung alle Gebissenen). Kann nicht gefressen/infiziert werden; gewinnt allein.',
    },
    anemic: {
      name: 'Der Anämische',
      description:
        'Spielt pro Dorf, bis der Vampir ihn beißt — dann wird er zum zweiten Vampir. Sobald es zwei Vampire gibt, stirbt das ausgewählte Opfer sofort zu Beginn des Tages.',
    },
    bat: {
      name: 'Die Fledermaus',
      description: 'Günstling des Vampirs. Überlebt die erste Lynchung.',
    },
    'ancient-vampire': {
      name: 'Der uralte Vampir',
      description:
        'Schwächerer Vampir mit zwei Optionen pro Nacht: Töten (entfällt, wenn am Tag niemand nominiert wird) ODER sich tarnen (vor sehenden Rollen geschützt, wird als pro Dorf angezeigt).',
    },
    bella: {
      name: 'Bella',
      description:
        'Schwärmt für den Vampir und will unbedingt von ihm gebissen werden. Sobald das passiert, gewinnt sie allein.',
    },
    frida: {
      name: 'Frida',
      description:
        'So schüchtern, dass sie am liebsten von den Wölfen gefressen werden möchte. Geschieht dies, gewinnt sie allein.',
    },
    jason: {
      name: 'Jason',
      description:
        'Möchte unbedingt vom Dorf gelyncht werden — dann gewinnt er. Ist er verliebt, gewinnt er nur, wenn er selbst gelyncht wird; wird der Partner gelyncht, stirbt Jason einfach.',
    },
    hermione: {
      name: 'Hermine',
      description:
        'Will alle Rollen korrekt zuordnen. Hat zwei Versuche (drei bei >20 Spielern); schafft sie es, gewinnt sie allein. Ist der letzte Versuch falsch, stirbt sie.',
    },
    rascal: {
      name: 'Der Strolch',
      description:
        'Wettet in der ersten Nacht auf das Ableben einer bestimmten Anzahl Mitbürger (je nach Gruppengröße drei bis fünf). Sobald diese alle tot sind, gewinnt der Strolch.',
    },
    groom: {
      name: 'Der Bräutigam',
      description:
        'Bestimmt jede Nacht einen Spieler als seine Braut (die es erfährt). Überlebt er mit drei Bräuten einen kompletten Tag-Nacht-Zyklus, gewinnt er allein. Die Bräute kennen sich, aber nicht den Bräutigam.',
    },
    blob: {
      name: 'Der Blob',
      description:
        'Saugt jede Nacht einen weiteren Bewohner ein (links- oder rechtsherum, er entscheidet). Sind alle Lebenden eingesaugt, ist das Dorf ein einziges Blob und er gewinnt.',
    },
    leech: {
      name: 'Der Blutegel',
      description:
        'Saugt seine Opfer aus: ausgesaugte Spieler sterben, sobald sie zum Lynch aufgestellt werden. Gewinnt, sobald er alle Spieler ausgesaugt hat.',
    },
    gull: {
      name: 'Die Möwe',
      description:
        'Kackt jede Nacht einer Person auf den Kopf — getroffene Köpfe bleiben getroffen. Gewinnt allein, sobald alle noch lebenden Mitspieler getroffen sind. Der Treffer selbst schadet niemandem.',
    },
    demon: {
      name: 'Der Dämon',
      description:
        'Nicht nachtaktiv. Jede nachtaktive Rolle, die ihn auswählt, stirbt. Zeigen die Wölfe auf ihn, stirbt nur einer der Wölfe. Gewinnt, wenn er als Einziger übrig bleibt.',
    },
    'stone-golem': {
      name: 'Der Steingolem',
      description:
        'Immun gegen den Vampirbiss. Pro Nacht eine von drei Optionen: normal töten, sich selbst schützen (unverwundbar) oder wachsen (ein zusätzliches Leben; erstes Leben = 2 Nächte, zweites = 3 usw.).',
    },
    stone: {
      name: 'Der Stein',
      description: 'Der Günstling des Golems. Wird zum Steingolem, falls dieser stirbt.',
    },
    werehamster: {
      name: 'Der Werhamster',
      description:
        'Gewinnt, sobald alle Werwölfe tot sind. Kann nicht von den Wölfen gefressen werden (in dem Fall entfällt das Fressen).',
    },
  },
  roleCategories: {
    werewolves: 'Werwölfe',
    villagers: 'Dorfbewohner',
    ambiguous: 'Zweideutige',
    loners: 'Einzelgänger',
  },
  factions: {
    village: 'Dorf',
    werewolves: 'Werwölfe',
    solo: 'Einzelgänger',
    variable: 'Variabel',
  },
  deathCauses: {
    werewolf: 'Werwolf',
    'witch-poison': 'Hexengift',
    lynch: 'Lynch',
    hunter: 'Jäger',
    heartbreak: 'Liebeskummer',
    'rusty-sword': 'Rostige Klinge',
    other: 'Sonstiges',
  },
  winConditions: {
    angel: {
      label: 'Engel',
      description:
        'Der Engel wurde in der ersten Runde aus dem Spiel entfernt und gewinnt sofort allein.',
    },
    'pied-piper': {
      label: 'Flötenspieler',
      description: 'Alle noch lebenden Spieler sind vom Flötenspieler betört — er gewinnt allein.',
    },
    gull: {
      label: 'Möwe',
      description:
        'Die Möwe hat allen noch lebenden Mitspielern auf den Kopf gekackt — sie gewinnt allein.',
    },
    'white-werewolf': {
      label: 'Weißer Werwolf',
      description: 'Der weiße Werwolf ist als Letzter übrig — er gewinnt allein.',
    },
    lovers: {
      label: 'Liebespaar',
      description: 'Nur noch das (gemischte) Liebespaar lebt — die Verliebten gewinnen gemeinsam.',
    },
    hermione: {
      label: 'Hermine',
      description: 'Hermine hat alle Rollen korrekt zugeordnet und gewinnt allein.',
    },
    bella: { label: 'Bella', description: 'Bella wurde vom Vampir gebissen und gewinnt allein.' },
    frida: {
      label: 'Frida',
      description: 'Frida wurde von den Wölfen gefressen und gewinnt allein.',
    },
    jason: { label: 'Jason', description: 'Jason wurde vom Dorf gelyncht und gewinnt allein.' },
    groom: {
      label: 'Bräutigam',
      description:
        'Der Bräutigam hat mit drei Bräuten einen kompletten Zyklus überlebt und gewinnt allein.',
    },
    rascal: {
      label: 'Strolch',
      description: 'Alle vom Strolch gewetteten Personen sind tot — er gewinnt allein.',
    },
    'serial-killer': {
      label: 'Serienkiller',
      description: 'Der Serienkiller ist als Letzter übrig — er gewinnt allein.',
    },
    demon: { label: 'Dämon', description: 'Der Dämon ist als Einziger übrig — er gewinnt allein.' },
    vampire: {
      label: 'Vampir',
      description: 'Der Vampir (bzw. das Vampir-Team) ist als Letzter übrig und gewinnt.',
    },
    blob: {
      label: 'Blob',
      description: 'Der Blob hat alle Lebenden eingesaugt und gewinnt allein.',
    },
    leech: {
      label: 'Blutegel',
      description: 'Der Blutegel hat alle Spieler ausgesaugt und gewinnt allein.',
    },
    'stone-golem': {
      label: 'Steingolem',
      description: 'Der Steingolem ist als Letzter übrig — er gewinnt allein.',
    },
    werehamster: {
      label: 'Werhamster',
      description: 'Alle Werwölfe sind tot — der Werhamster gewinnt.',
    },
    werewolves: {
      label: 'Werwölfe',
      description: 'Die Werwölfe haben zahlenmäßige Gleichheit oder Überzahl erreicht.',
    },
    village: {
      label: 'Dorf',
      description: 'Alle Werwölfe (und ggf. andere Bedrohungen) wurden eliminiert.',
    },
    none: { label: 'Niemand / Abgebrochen', description: 'Patt, Abbruch oder kein Sieger.' },
  },
  winCategories: {
    village: 'Dorf',
    werewolves: 'Werwölfe',
    lovers: 'Liebespaar',
    solo: 'Einzelgänger',
  },
  winCategoryRationale: {
    village: 'Die Mehrheit am Tisch teilt sich den Sieg.',
    werewolves: 'Nur das kleine Rudel gewinnt — gegen die Übermacht.',
    lovers: 'Zwei gegen alle, und beide müssen überleben.',
    solo: 'Ein Sieg ganz allein gegen den ganzen Tisch.',
  },
  noWinner: 'Kein Sieger',
  setRatings: {
    '1': 'Flop',
    '2': 'Naja',
    '3': 'Okay',
    '4': 'Gut',
    '5': 'Top',
  },
}
