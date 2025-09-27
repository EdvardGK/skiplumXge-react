# KRITISK: Matrikkel API krever Maskinporten - IKKE Basic Auth

## ⚠️ VIKTIG OPPDAGELSE

De oppgitte brukernavn/passord credentials (`skiplum_matrikkeltest`) er IKKE for direkte API-tilgang. Matrikkel API krever **Maskinporten** for autentisering.

## Hva er Maskinporten?

Maskinporten er Norges nasjonale løsning for sikker maskin-til-maskin autentisering, levert av Digitaliseringsdirektoratet (Digdir). Dette er en OAuth2-basert tjeneste som krever:

1. **Norsk organisasjonsnummer**
2. **Registrert integrasjon i Maskinporten**
3. **Tildelt scope fra Kartverket**
4. **JWT-basert token-utveksling**

## Krav for Matrikkel API tilgang

### 1. Avtale med Kartverket
- Virksomheten må ha en **aktiv avtale om eiendomsdata** med Kartverket
- Søke om tilgang til ny tjeneste via eget nettskjema
- Signere tillegg til eksisterende avtale

### 2. Programvarebruker
- Brukernavnet (`skiplum_matrikkeltest`) er en programvarebruker
- Sendes som HTTP header: `X-matrikkel-brukernavn`
- IKKE brukt for autentisering, men for rettighetskontroll

### 3. Maskinporten-integrasjon
Virksomheten må:
1. Opprette integrasjon i Maskinporten
2. Få tildelt scope fra Kartverket (f.eks. `kartverket:matrikkel/les`)
3. Generere JWT-token via Maskinporten
4. Bruke token i `Authorization: Bearer {token}` header

## Autentiseringsflyt

```
1. Virksomhet → Maskinporten: Request token with scope
2. Maskinporten → Virksomhet: JWT access token
3. Virksomhet → Matrikkel API:
   - Authorization: Bearer {maskinporten_token}
   - X-matrikkel-brukernavn: skiplum_matrikkeltest
4. Matrikkel API: Validates both token AND user rights
```

## Hvorfor vi får 404 feil

Vi får 404 fordi:
1. Vi prøver å bruke Basic Auth (feil autentiseringsmetode)
2. Vi har ikke Maskinporten-token
3. API-et er sannsynligvis ikke tilgjengelig uten gyldig Maskinporten-autentisering

## Hva som trengs for å få dette til å virke

### For Skiplum AS:

1. **Bekreft organisasjonsnummer** - Trengs for Maskinporten
2. **Sjekk avtale med Kartverket** - Må ha aktiv avtale om eiendomsdata
3. **Søk om API-tilgang** - Via Kartverkets nettskjema
4. **Opprett Maskinporten-integrasjon**:
   - Logg inn på samarbeidsportalen.digdir.no
   - Opprett ny integrasjon
   - Vent på tildelt scope fra Kartverket
5. **Implementer OAuth2-flyt**:
   - Generer JWT assertion
   - Utveksle til access token
   - Bruk token i API-kall

### Teknisk implementasjon som trengs:

```javascript
// Dette er FEIL (det vi prøvde):
client.setSecurity(new soap.BasicAuthSecurity(username, password));

// Dette er RIKTIG (det som trengs):
const maskinportenToken = await getMaskinportenToken({
  client_id: 'din-maskinporten-client-id',
  scope: 'kartverket:matrikkel/les',
  private_key: privateKey,
  issuer: 'organisasjonsnummer'
});

const headers = {
  'Authorization': `Bearer ${maskinportenToken}`,
  'X-matrikkel-brukernavn': 'skiplum_matrikkeltest'
};
```

## Midlertidig løsning

Inntil Maskinporten-integrasjon er på plass:

1. **Bruk kun Kartverket REST API** for adressesøk (krever ingen autentisering)
2. **Ikke prøv å koble til Matrikkel SOAP/REST API** uten Maskinporten
3. **Forbered kodebase** for Maskinporten-integrasjon

## Kontaktinformasjon

For spørsmål om tilgang: **matrikkelhjelp@kartverket.no**

## Referanser

- [Kartverkets dokumentasjon om tilgangsstyring](https://kartverket.no/api/matrikkel)
- [Digdir Maskinporten dokumentasjon](https://docs.digdir.no/maskinporten)
- [Maskinporten selvbetjening](https://samarbeidsportalen.digdir.no)

---

**STATUS**: Matrikkel API kan IKKE brukes uten Maskinporten-integrasjon. Credentials alene er ikke nok.