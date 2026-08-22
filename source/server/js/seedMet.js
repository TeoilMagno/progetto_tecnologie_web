const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const Museum = require('./models/museums');
const Work = require('./models/works');
const Author = require('./models/author');
const Style = require('./models/style');

const dbURI = process.env.DB_URI;

if (!dbURI) {
  console.error("ERRORE: DB_URI non trovato nelle variabili d'ambiente. Verifica il file .env");
  process.exit(1);
}

async function seed() {
  console.log("Connessione al database...");
  await mongoose.connect(dbURI, { dbName: 'ArtAround' });
  console.log("Connesso.");

  // 1. Eliminiamo il vecchio museo MET se esiste
  let met = await Museum.findOne({ name: 'MET' });
  if (met) {
    console.log("Rimozione vecchio museo MET e opere associate...");
    await Work.deleteMany({ museumId: met._id });
    await Museum.deleteOne({ _id: met._id });
  }

  // 2. Creiamo il nuovo museo MET
  met = new Museum({
    name: 'MET',
    address: '1000 5th Ave, New York, NY 10028, USA',
    latitude: 40.779437,
    longitude: -73.963244,
    contact_email: 'info@metmuseum.org',
    contact_phone: '+1 212-535-7710',
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Metropolitan_Museum_of_Art_Jan_2013.jpg',
    tags: ['Arte Antica', 'Pittura', 'Scultura', 'Impressionismo'],
    ticketPrice: 25,
    services: ['bathrooms', 'cafe', 'cloakroom', 'accessibility_ramp', 'wifi'],
    openingHours: 'Mar-Dom: 10:00 - 17:00',
    openingDays: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  });
  await met.save();
  console.log("Museo MET creato con successo! ID:", met._id);

  // 3. Creiamo o troviamo gli autori
  const authorsData = [
    { name: 'Jacques-Louis David', bio: 'Famoso pittore neoclassico francese.', bd: '1748 - 1825' },
    { name: 'Emanuel Leutze', bio: 'Pittore tedesco-americano celebre per le sue scene storiche.', bd: '1816 - 1868' },
    { name: 'Vincent van Gogh', bio: 'Celeberrimo pittore post-impressionista olandese.', bd: '1853 - 1890' },
    { name: 'John Singer Sargent', bio: 'Importante pittore ritrattista americano.', bd: '1856 - 1925' },
    { name: 'Claude Monet', bio: 'Padre fondatore dell\'impressionismo francese.', bd: '1840 - 1926' }
  ];

  const authorsMap = {};
  for (const a of authorsData) {
    let author = await Author.findOne({ name: a.name });
    if (!author) {
      author = new Author({
        name: a.name,
        data: [{
          museumId: [met._id],
          bio: a.bio,
          bd: a.bd,
          studies: 'Accademia di Belle Arti',
          mainWorks: 'Vari capolavori'
        }]
      });
      await author.save();
    } else {
      // Aggiungi il MET ai musei se non c'è già
      const dataObj = author.data[0];
      if (dataObj && !dataObj.museumId.includes(met._id)) {
        dataObj.museumId.push(met._id);
        await author.save();
      }
    }
    authorsMap[a.name] = author._id;
  }
  console.log("Autori creati/collegati.");

  // 4. Creiamo o troviamo gli stili
  const stylesData = [
    { name: 'Neoclassicismo', description: 'Movimento artistico ispirato all\'arte classica greca e romana.' },
    { name: 'Romanticismo Storico', description: 'Scene drammatiche e storiche cariche di pathos.' },
    { name: 'Post-Impressionismo', description: 'Uso espressivo del colore e di pennellate evidenti.' },
    { name: 'Realismo / Ritrattismo', description: 'Ritratti espressivi con forte realismo psicologico.' },
    { name: 'Impressionismo', description: 'Cattura della luce e dell\'atmosfera all\'aperto.' }
  ];

  const stylesMap = {};
  for (const s of stylesData) {
    let style = await Style.findOne({ name: s.name });
    if (!style) {
      style = new Style({
        name: s.name,
        data: [{
          museumId: [met._id],
          description: s.description
        }]
      });
      await style.save();
    } else {
      const dataObj = style.data[0];
      if (dataObj && !dataObj.museumId.includes(met._id)) {
        dataObj.museumId.push(met._id);
        await style.save();
      }
    }
    stylesMap[s.name] = style._id;
  }
  console.log("Stili creati/collegati.");

  // 5. Creiamo le 5 opere d'arte associate al MET
  const worksData = [
    {
      name: "La Morte di Socrate",
      author: authorsMap['Jacques-Louis David'],
      technique: "Dipinto a olio su tela",
      style: stylesMap['Neoclassicismo'],
      year: "1787",
      image: "https://upload.wikimedia.org/wikipedia/commons/8/8c/David_-_The_Death_of_Socrates_-_Google_Art_Project.jpg",
      description: {
        simple: {
          short: "Socrate beve la cicuta circondato dai suoi discepoli in lacrime.",
          medium: "Un capolavoro del neoclassicismo che celebra la fedeltà ai propri ideali e alla ragione filosofica fino alla morte.",
          long: "La scena ritrae Socrate nel momento di bere la cicuta, continuando a insegnare la filosofia ai suoi discepoli disperati.",
          exhaustive: "La scena ritrae Socrate nel momento di bere la cicuta, continuando a insegnare la filosofia ai suoi discepoli disperati."
        }
      },
      funFact: "David studiò attentamente i dialoghi di Platone per ricreare fedelmente la cerchia e l'atteggiamento dei presenti.",
      paraphrase: "Socrate sceglie di morire per obbedire alle leggi della sua città, piuttosto che rinnegare la propria filosofia.",
      museumId: met._id
    },
    {
      name: "Washington attraversa il Delaware",
      author: authorsMap['Emanuel Leutze'],
      technique: "Dipinto a olio su tela",
      style: stylesMap['Romanticismo Storico'],
      year: "1851",
      image: "https://upload.wikimedia.org/wikipedia/commons/9/95/Washington_Crossing_the_Delaware_by_Emanuel_Leutze%2C_MMA-NYC%2C_1851.jpg",
      description: {
        simple: {
          short: "George Washington guida le truppe americane attraverso il fiume ghiacciato Delaware.",
          medium: "Celebre dipinto che commemora l'attacco a sorpresa di Washington a Trenton durante la rivoluzione americana.",
          long: "Il dipinto è noto per la sua composizione eroica e patriottica, con Washington fiero a prua della barca.",
          exhaustive: "Il dipinto è noto per la sua composizione eroica e patriottica, con Washington fiero a prua della barca."
        }
      },
      funFact: "Il dipinto fu originariamente realizzato in Germania per incoraggiare i riformatori europei dopo le rivoluzioni del 1848.",
      paraphrase: "Washington guida i suoi soldati attraverso una notte gelida per compiere un attacco decisivo per l'indipendenza.",
      museumId: met._id
    },
    {
      name: "Autoritratto con cappello di paglia",
      author: authorsMap['Vincent van Gogh'],
      technique: "Dipinto a olio su tela",
      style: stylesMap['Post-Impressionismo'],
      year: "1887",
      image: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Vincent_van_Gogh_-_Self-Portrait_with_Straw_Hat_-_Google_Art_Project.jpg",
      description: {
        simple: {
          short: "Uno dei celebri autoritratti di Van Gogh dipinto a Parigi.",
          medium: "Dipinto con colori brillanti e pennellate rapide, mostra l'influenza della teoria del colore impressionista.",
          long: "In questo autoritratto, Van Gogh usa forti contrasti cromatici e una vibrante pennellata circolare.",
          exhaustive: "In questo autoritratto, Van Gogh usa forti contrasti cromatici e una vibrante pennellata circolare."
        }
      },
      funFact: "Sul retro di questa tela Van Gogh dipinse un'altra opera, 'La tosatura delle pecore', per risparmiare denaro sulle tele.",
      paraphrase: "Van Gogh si ritrae come un contadino o lavoratore, esprimendo la sua complessa interiorità con colori accesi.",
      museumId: met._id
    },
    {
      name: "Madame X",
      author: authorsMap['John Singer Sargent'],
      technique: "Dipinto a olio su tela",
      style: stylesMap['Realismo / Ritrattismo'],
      year: "1884",
      image: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Madame_X_%2C_Madame_Pierre_Gautreau%2C_John_Singer_Sargent%2C_1884.jpg",
      description: {
        simple: {
          short: "Ritratto di Virginie Amélie Avegno Gautreau in un abito nero scollato.",
          medium: "Un ritratto audace che suscitò enorme scandalo a Parigi per via del suo stile sensuale e anticonvenzionale.",
          long: "Il dipinto enfatizza la pelle bianchissima della modella e la linea sinuosa del suo abito di raso nero.",
          exhaustive: "Il dipinto enfatizza la pelle bianchissima della modella e la linea sinuosa del suo abito di raso nero."
        }
      },
      funFact: "Sargent originariamente dipinse una delle spalline dell'abito caduta sulla spalla, ma dovette ridipingerla al suo posto a causa dello scandalo.",
      paraphrase: "Una donna dell'alta società parigina posa fiera, sfidando i costumi morali tradizionali del tempo.",
      museumId: met._id
    },
    {
      name: "Lo stagno delle ninfee",
      author: authorsMap['Claude Monet'],
      technique: "Dipinto a olio su tela",
      style: stylesMap['Impressionismo'],
      year: "1899",
      image: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Claude_Monet_Bridge_over_a_Pond_of_Water_Lilies_Google_Art_Project.jpg",
      description: {
        simple: {
          short: "Un ponte di legno in stile giapponese che sovrasta un laghetto fiorito di ninfee.",
          medium: "Monet dipinse questo celebre scorcio del suo giardino a Giverny, catturando i riflessi della luce sull'acqua.",
          long: "Il dipinto si concentra sulla vegetazione lussureggiante e sulle variazioni atmosferiche di luce e ombra.",
          exhaustive: "Il dipinto si concentra sulla vegetazione lussureggiante e sulle variazioni atmosferiche di luce e ombra."
        }
      },
      funFact: "Monet costruì di persona lo stagno e il ponte giapponese per avere sempre a disposizione il soggetto perfetto da dipingere.",
      paraphrase: "La natura del giardino di Monet viene rappresentata come un'armonia di colori riflessi e forme soffuse.",
      museumId: met._id
    }
  ];

  await Work.insertMany(worksData);
  console.log("Le 5 opere sono state inserite nel database!");

  mongoose.disconnect();
  console.log("Fine della procedura di seeding.");
}

seed().catch(err => console.error(err));
