# Image Wizard CLI

## Installation

```bash
npm install -g @involvex/image-wizard-cli
```

## Usage

```bash
image-wizard <prompt>
```

## Configuration

~/.image-wizard/config.json

## Example

```json
{
    "auth_cookie_u": "1HE7aP-EHWqSHcxPZO-XnjiJYquS1a0FRh3JQMwS-7TIxlCUjNgXb3zzQ4p80B6tgLIrq8PqfjIYf7XPWP7Ox8PZcg6kLs19Kz3sS7VQeYPhsKBANz8Q0he3vrn_O_w2rRAsHURVxhKaW2oKcSxXuXxgrZ8NR5mmTdp_IYQQ55IhWUE_Zr9alttdmUDqGMncLh5FzwUfZnM-2vdVsRiOS6g",
    "auth_cookie_srchhpgusr": "SRCHLANG=de&PV=19.0.0&PREFCOL=1&BRW=NOTP&BRH=M&CW=771&CH=914&SCW=756&SCH=914&DPR=1.0&UTC=60&PRVCW=1218&PRVCH=914&B=0&EXLTT=32&HV=1769901195&HVE=CfDJ8HAK7eZCYw5BifHFeUHnkJFvqEePzUT4Ba5yC4HMf7gQVgS1Kg0rMLGn9T2VOrJvwOz33K2tVOp8qzdO3OXMoSuEjlNzwMNdEmHrLsQF2YgBeeO-Aa9C8ClOxJM7TxsGgGU9OX_u2kV6EZd4pDsKT1F7xFQEtr7hXCMHIq2ll0BX_vhf6FTjVXFUqkJoZ8joxQ&AV=14&ADV=14&RB=1769897306292&MB=1767735921711&WEBTHEME=1",
    "output_dir": "output",
    "num_images": 5
    }
```

## Setup

```bash
npm install -g @involvex/image-wizard-cli
image-wizard setup
```

## Prompt example

```bash
image-wizard "A photo of an astronaut riding a horse on Mars"
image-wizard "A photo of an astronaut riding a horse on Mars" --amount 5 --outputdir output
image-wizard "A photo of an astronaut riding a horse on Mars" -n 6 -o output
```

## Tech

node, bun, python, typescript, bing, clack (for cli ui)

NodeJs / Bun wrapper for python package bing-create

## Description

use "image-wizard setup" that will open a browser session with https://bing.com open and user logged , then executes in the browser console:

```bash
console.log(`_U:\n${document.cookie.match(/(?:^|;\s*)_U=(.*?)(?:;|$)/)[1]}\n\nSRCHHPGUSR:\n${document.cookie.match(/(?:^|;\s*)SRCHHPGUSR=(.*?)(?:;|$)/)[1]}`)
```

Then it will fetch from console output:

```bash
_U:
1HE7aP-EHWqSHcxPZO-XnjiJYquS1a0FRh3JQMwS-7TIxlCUjNgXb3zzQ4p80B6tgLIrq8PqfjIYf7XPWP7Ox8PZcg6kLs19Kz3sS7VQeYPhsKBANz8Q0he3vrn_O_w2rRAsHURVxhKaW2oKcSxXuXxgrZ8NR5mmTdp_IYQQ55IhWUE_Zr9alttdmUDqGMncLh5FzwUfZnM-2vdVsRiOS6g

SRCHHPGUSR:
SRCHLANG=de&PV=19.0.0&PREFCOL=1&BRW=NOTP&BRH=M&CW=771&CH=914&SCW=756&SCH=914&DPR=1.0&UTC=60&PRVCW=1218&PRVCH=914&B=0&EXLTT=32&HV=1769901195&HVE=CfDJ8HAK7eZCYw5BifHFeUHnkJFvqEePzUT4Ba5yC4HMf7gQVgS1Kg0rMLGn9T2VOrJvwOz33K2tVOp8qzdO3OXMoSuEjlNzwMNdEmHrLsQF2YgBeeO-Aa9C8ClOxJM7TxsGgGU9OX_u2kV6EZd4pDsKT1F7xFQEtr7hXCMHIq2ll0BX_vhf6FTjVXFUqkJoZ8joxQ&AV=14&ADV=14&RB=1769897306292&MB=1767735921711&WEBTHEME=1
```

and writes it into the config at: "~/.image-wizard/config.json"

after users can run:

```bash
image-wizard <prompt>
```

that will execute the python script from @/bing-create/create.py and generates the images.

## Todo

Write the typescript file for the "bin" (src/index.ts).
Setup create.py to use configured settings or env vars / parameter.
