# Billiard Traveller PRO — Εφαρμογή Τουρνουά (σημείωμα μεταφοράς)

Έκδοση: **v51** (09/10/2026). Αρχεία: `app.html` (εφαρμογή + σελίδα παικτών), `index.html` (κεντρική σελίδα με όλα τα τουρνουά), `firestore-rules.txt`, `ODIGIES.txt`.
Κανόνας: **ο αριθμός έκδοσης αλλάζει σε κάθε αναβάθμιση** (`APP_VERSION`, `<title>`, `#appVersion`, ιστορικό στην αρχή του app.html).

## Online (σε λειτουργία)
- Σελίδα: https://koyrkoylosk.github.io/Billiard_Traveller/  (GitHub Pages, λογαριασμός `koyrkoylosk`, repo `Billiard_Traveller`)
- Τουρνουά: `app.html?t=<κωδικός>&s=<32|64>`
- Firebase έργο `billiard-traveller` (Firestore + Authentication Google). Authorized domain: `koyrkoylosk.github.io`.
- firebaseConfig (δημόσιο, όχι μυστικό):
  apiKey "AIzaSyAJmOe7Woh92qMCDTy0HtepvJJDcrFgSfE", authDomain "billiard-traveller.firebaseapp.com", projectId "billiard-traveller",
  storageBucket "billiard-traveller.firebasestorage.app", messagingSenderId "481554679650", appId "1:481554679650:web:d9d13e5d21ca89b11ace3b"
- Firebase SDK compat 10.12.2 από gstatic, QR από qrcodejs (cdnjs) με εφεδρεία api.qrserver.com.

## Δεδομένα Firestore
- `tournaments/{tid}` (tid: `^[a-z0-9-]{3,60}$`):
  `title, size, status (upcoming|live|finished), champion, entries, startDate, days, updatedAt, updatedBy,
   owner (email), organizer (όνομα), facebook (url), createdAt, state (JSON string όλης της κατάστασης, <900KB)`
- `publishers/{email}` (email με μικρά): `name, facebook, active (bool)` — διοργανωτές με άδεια δημοσίευσης.
- Δικαιώματα: ανάγνωση τουρνουά = όλοι. Ιδιοκτήτης πλατφόρμας `kostas.koyrkoyloss@gmail.com` (SUPER_EMAILS) γράφει τα πάντα.
  Διοργανωτής με `active != false` δημιουργεί τουρνουά με owner = το email του και αλλάζει ΜΟΝΟ όσα έχουν owner = το email του.
  Το `publishers` το γράφει μόνο ο ιδιοκτήτης· ο καθένας διαβάζει μόνο τη δική του γραμμή. (Δες firestore-rules.txt.)
- Ο admin ανεβάζει όλη την κατάσταση (debounce 1,2 s μετά από κάθε αποθήκευση)· οι θεατές έχουν onSnapshot (ζωντανά).
  Εικόνες (αφίσα/χορηγοί) ΔΕΝ ανεβαίνουν online.
- Τοπικά: localStorage `BT32_MENU_STATE_V1` / `BT64_MENU_STATE_V1`, online `BTC_<tid>`.
- Στο αρχείο (file://) ο admin μπαίνει με κωδικό· online ΜΟΝΟ με Google. (Εκκρεμεί: αφαίρεση κωδικού από το δημόσιο app.html, αυτόματη λήξη άδειας `expires`.)

## Μοντέλο αγώνων (μέσα στο app.html)
- Διπλή πυραμίδα έως 8+8 και μετά Knock Out 16. 32: πρόκριση 1–40, KO 41–55. 64: πρόκριση 1–104, KO 105–119
  (εσωτερικά το KO είναι πάντα 41–55, εμφάνιση με `koNo(id)`, KOFF = NQ−40).
- Πρόκριση: πίνακας `matches[]` με `{id, playerA:{name,points,innings}, playerB, ffA, ffB, running, done, date, time, youtube, early}`· σερί ανά παίκτη/αγώνα.
  Ροή: `FLOW[id] = [{t:'W'|'L', m}]`, γύροι `ROUNDS` (R1, W, WF, L, LF), `propagateFromMatch()`, `winnerSide(m)`.
- KO: `koMatches[41..55]` (στοιχεία DOM: nameA/nameB, πόντοι, στεκιές, σερί, running/stopped), `koGetWinLose(id)`· τελικός = 55.
- Μετά από κάθε αλλαγή: `recomputeFinalAndStats()` και `saveAutosaveSnapshot()` (→ online push).
- Πλήρης κατάσταση: `buildAutosaveSnapshot()` / `applyBackup(data)`.

## Σύνδεση με το Scoreboard (v35 τουρνουά + v31.21 Scoreboard) — ΥΛΟΠΟΙΗΘΗΚΕ
- Δύο έργα Firebase: το Scoreboard (cue-club-corfu) ανοίγει δεύτερη σύνδεση (app «bttour») στο billiard-traveller ΜΟΝΟ για τα τουρνουά.
- Firestore κάτω από `tournaments/{tid}`:
  `private/tablekey {code}` (κλειδί τραπεζιών, μόνο διοργανωτής) · `assign/{τραπέζι} {match,a,b,dist,inn,eq,phase,title,seq}` (γράφει ο διοργανωτής, διαβάζουν όλοι) ·
  `tables/{τραπέζι} {key,no,label,club,seen,status,match,ver}` και `live/{αγώνας} {key,table,match,seq,status running|done|aborted,a:{name,pts,inn,run},b}`
  (γράφει το τραπέζι με το κλειδί, διαβάζει ο διοργανωτής).
- Ο admin (ανοιχτός) είναι ο «εγκέφαλος»: αυτόματη ανάθεση (σειρά: ώρα προγράμματος, μετά αριθμός), ζωντανό σκορ στους αγώνες,
  αυτόματο κλείσιμο (πρόκριση: propagateFromMatch · KO: btnStop) και αμέσως νέα ανάθεση. Αριθμοί αγώνων όπως φαίνονται (KO = NQ+1…NQ+15).
- Ρυθμίσεις στο snapshot (`tbl.cfg`: auto, distQ, distKO, distF, innQ, innKO, innF (0 = χωρίς όριο), eq) και `tbl.view` (κατάσταση τραπεζιών για τους θεατές + ένδειξη «🎱 Τ2»).
- Scoreboard: ADMIN → 📱 → «Online τουρνουά» (κωδικός + κλειδί, ή QR `https://bt-scoreboard-cfu.web.app/#tour=<tid>&k=<key>`),
  οθόνη «Επόμενος αγώνας» με ΕΝΑΡΞΗ, σκορ κάθε 2″, τελικό αποτέλεσμα με ουρά επανάληψης χωρίς internet.

## Βασικοί κανόνες τουρνουά (σύνοψη — πλήρης λίστα: BT32_zitoumena.md στο project «TOURNAMENT»)
- FINAL 16 ζευγάρια 1-16, 8-9, 5-12, 4-13, 3-14, 6-11, 7-10, 2-15· γεμίζει μία φορά και παγώνει όταν ξεκινήσει το KO.
- Θέσεις 1–8 από τον τελευταίο γύρο νικητών, 9–16 από τον τελευταίο γύρο ηττημένων· Τελική 16άδα μόνο από την πρόκριση, με Μ.Ο., ισοβαθμία → μεγαλύτερο σερί.
- KO: περνούν μόνο νικητές, ονόματα κλειδωμένα, στεκιές καθρέφτης, κατάταξη με θέση τερματισμού (1,2,3,3,5–8,9–16).
- BYE: ποτέ BYE vs BYE στην κλήρωση, αγώνες με BYE κλείνουν αυτόματα. Επικεφαλής δεν πέφτουν μαζί στον 1ο γύρο. F.F. σε κάθε αγώνα.
- Μοναδικές συμμετοχές (χωρίς διάκριση κεφαλαίων/τόνων).
- Πρόγραμμα: ημερομηνία/ώρα έναρξης, τραπέζια, 1:30 ανά αγώνα, 9 σειρές/μέρα 10:00–22:00, 3 μέρες (Παρ–Κυρ), KO πρωί τελευταίας μέρας,
  προημιτελικά σε 2 τραπέζια σε 2 ομάδες, τελικός αμέσως μετά τους ημιτελικούς· «⏩ Νωρίτερα» ανά αγώνα, έλεγχος χωρητικότητας.
- Στατιστικά: Player Stats όλο το τουρνουά με Μ.Ο. (+πόντοι/στεκιές, σερί), Top 5 Μ.Ο., Top 5 σερί.
- Εμφάνιση: 4 θέματα, αποχρώσεις χαρτιού, Κλασική/Γραμμές, 32/64 από το Μενού, πορτοκαλί επισήμανση παίκτη.

## Κανόνες καραμπόλας στο Scoreboard (v31.22)
- Όριο στεκιών (π.χ. 30 πόντοι – 50 στεκιές): μετά τις στεκιές και των δύο κερδίζει ο περισσότερους πόντους· ίσοι = ισοπαλία.
- Τελευταία στεκιά ισοφάρισης: αν ο 1ος παίκτης (σπάει) φτάσει πρώτος την απόσταση, ο 2ος παίζει μία στεκιά· αν φτάσει κι αυτός = ισοπαλία.
- Ισοπαλία σε αγώνα τουρνουά: το αποτέλεσμα πηγαίνει στο τουρνουά, αλλά ο αγώνας ΔΕΝ κλείνει αυτόματα — ο διοργανωτής αποφασίζει και πατά ⛔.
- ⏱ Παράταση (v37): κουμπί `icon ot` σε κάθε αγώνα (admin): πόντοι παράτασης «3-2» → πρόσθεση στους πόντους + 1 στεκιά και στους δύο (μετράνε και στον Μ.Ο., επιλογή του Κώστα), επαναλαμβάνεται, και με νικητή κλείσιμο (⛔). Τα σκορ από τραπέζι δεν ξαναγράφουν αγώνα με περισσότερες στεκιές από αυτές του τραπεζιού.

## v38 — απλή διοργάνωση, ωράριο, ελεύθερο παιχνίδι
- `publishers/{email}` έχει και `club` (το γράφει το BT Setup από το πεδίο «Gmail για διοργάνωση τουρνουά», μαζί με `licenses/{code}.tourEmail`).
- Ο admin γράφει στη βάση του Scoreboard (έργο cue-club-corfu, δεύτερο app «btsb», χωρίς σύνδεση — επιτρέπεται για ενεργά κλαμπ):
  `clubs/{κλαμπ}/tour/current {tid,key,title,organizer,size,active,at}` — ανανέωση κάθε 10′, `active:false` όταν βγει πρωταθλητής.
  Το Scoreboard (v31.24) με άδεια αυτού του κλαμπ συνδέεται/αποσυνδέεται μόνο του (`bttLink.auto`). Ο χειροκίνητος τρόπος μένει.
- Τουρνουά: `club` στο έγγραφο· `tbl.cfg.club, sched (τήρηση ωραρίου), lead (λεπτά πριν)`.
- Τραπέζι `tables/{n}.paused` (ελεύθερο παιχνίδι): δεν παίρνει αγώνες· αγώνας που περίμενε επιστρέφει (κατάσταση «Εκτός τουρνουά»).
- v39: `tbl.cfg.started` (▶ ΕΝΑΡΞΗ ΤΟΥΡΝΟΥΑ — χωρίς αυτό δεν γίνονται αναθέσεις), σειρά αριθμών (sched προαιρετικό, default off), `warm` λεπτά ζεστάματος στην ανάθεση· τραπέζι `status:'warmup'` → «Ζέσταμα». Scoreboard v31.25: 🏆 ανοίγει αυτή την εφαρμογή (Electron: shell.openExternal), οθόνη ζεστάματος, αναβοσβήνει η ανάθεση.
- v40: «συνδεδεμένο» τραπέζι = σήμα που ΕΦΤΑΣΕ τα τελευταία 3′ (τοπική ώρα λήψης `_rx`, όχι το ρολόι του tablet)· σκορ με ίδιο seq ανάθεσης γίνεται δεκτό και με διαφορετική γραφή ονομάτων.
- v41: το «Κλαμπ τραπεζιών» κρατιέται όπως γράφεται· η σύνδεση `clubs/{κλαμπ}/tour/current` γράφεται και στη μορφή με ΚΕΦΑΛΑΙΑ. Το Scoreboard v31.26 ακούει και τις δύο μορφές και, χωρίς άδεια, χρησιμοποιεί το όνομα κλαμπ από το ADMIN.
- v42: ΠΑΡΑΤΑΣΗ χωριστά από το σκορ: `m.ot` / `k.ot` = [πόντοι Α, πόντοι Β] (δεν μετράνε σε σκορ/στεκιές/Μ.Ο.)· `winnerSide`/`koGetWinner`/`koGetWinLose` σε ισοπαλία κρίνουν με το ot. Σειρά παικτών `m.white` / `k.white` = 'A'|'B' (λευκή = 1ος). Live doc από Scoreboard v31.27: `ord:'assign'` (a/b με τη σειρά της ανάθεσης), `white:'a'|'b'`, `ext:{a,b}`.
- v43: 🗑 `cloudDeleteTournament()` (Μενού → Online δημοσίευση): clubs/{κλαμπ}/tour/current active:false → σβήσιμο live/tables/assign/private → tournaments/{tid} → localStorage `BTC_<tid>`· `cloudDeleted` σταματά κάθε αποθήκευση. PWA: `manifest.webmanifest` (start_url `app.html?app=1` → τελευταίο τουρνουά από `bt_last_tour`, αλλιώς index.html), `sw.js` (network-first, μόνο ίδιο origin), εικονίδια `tour-*.png`.
- v44: η διαγραφή είναι «μαλακή»: `deleted:true` στο tournaments/{tid} (+deletedAt/deletedBy), αρχείο backup + `BT_DEL_<tid>`, τα τραπέζια αποσυνδέονται και σβήνονται assign/live/tables (μένει το private/tablekey). Λωρίδα `#delBanner` με «↩ ΕΠΑΝΑΦΟΡΑ» (deleted:false + reload), «💾 Backup», «✖ Οριστική διαγραφή». index.html: κρύβει τα deleted, «♻ Διαγραμμένα».
- v45: διαγραφή με απλό confirm (χωρίς κωδικό). index.html: firebase-auth, «👤 Σύνδεση», κουμπιά 🗑 (softDelete: backup αρχείο, clubs/{κλαμπ} active:false, σβήσιμο assign/live/tables, deleted:true) και ↩ (deleted:false) για ιδιοκτήτη πλατφόρμας ή owner του τουρνουά.
- v46: Τελική 16άδα με σταθερές θέσεις: seeds[0..7] μόνο από TOP (WF), seeds[8..15] μόνο από BOT (LF), κενά = null (πριν: concat → η πλευρά ηττημένων ανέβαινε στις 1–8 όταν έλειπαν αήττητοι).
- v47: πάνω μπάρα `#tbChip` (τραπέζια online/σύνολο, κλικ → #tblSection) και `#tbStart` (πατά το #tblStart)· tblTopUi() σε tblRender/tblStartUi και κάθε 15″.
- v48: PIN admin ανά κλαμπ: Firebase Anonymous + `clubadmin/{κλαμπ}` {pin (μόνο ιδιοκτήτης/κανόνες), uid} + `clubsess/{κλαμπ}` {uid,label,at} (δημόσιο). Κανόνες: `pinAdmin(club)` σε canManage και tournaments create/update/delete (club αμετάβλητο). cloudRole.pin, owner `club:<κλαμπ>` για τουρνουά από PIN. Λίστα κλαμπ από clubKeys (βάση Scoreboard) για τον ιδιοκτήτη (#cloudClubSel) και datalist στο #tblClub με αυτόματη διόρθωση κεφαλαίων (clubExact). `TBL.cfg.off[τραπέζι]` = δεν παίρνει αγώνες. BT Setup: πεδίο PIN → clubadmin.
- v49: PIN modal βρίσκει το κλαμπ case-insensitive (clubExact)· clubAutoFix(): ιδιοκτήτης/διοργανωτής διορθώνει αυτόματα το club του τουρνουά στο ακριβές όνομα άδειας (οι κανόνες του PIN θέλουν ακριβές όνομα).
