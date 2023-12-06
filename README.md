# Horus-Heresy

This is a test repository for the Horus Heresy Rosterizer Rulebook.

Data on the main branch is currently drawn from the [BSData Horus Heresy team](https://github.com/BSData/horus-heresy).

Data on the dev branch is designed to come from raw publication transcriptions which will be drawn from the [30KYaml repository](https://github.com/LeonisAstra/30KYaml).


-------

## Repository Organization:

This repository is organized with the following guidelines:
  - `$ARMY_NAME/` - *Parent folder containing the jsons for the desired army.*
    - `00-Generic.json` - *Contains all generic rules/assets/models/units that apply universally to the given army. (EX: Tactical Marine Squad for Legiones Astartes)*
    - `XX-$FORCE_NAME.json` - *Contains all specific rules/assets/models/units that apply only to a specific subset of the army (EX: Dark Fury for the Raven Guard.)*
