import { canvasToBlob } from '@/shared/lib/image';

function drawingUrl(body: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
    <rect width="768" height="768" fill="white"/>
    <g fill="none" stroke="#252525" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">${body}</g>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function drawing(body: string) {
  return {
    src: drawingUrl(body),
    outlineSrc: drawingUrl(body.replace(/fill="#(?!252525)[0-9a-f]{6}"/gi, 'fill="white"')),
  };
}

export const SAMPLES = [
  {
    id: 'person',
    ...drawing(`
      <circle cx="384" cy="180" r="76"/>
      <path d="M328 258 L440 258 L455 436 L313 436 Z" fill="#f8b5a0"/>
      <path d="M329 278 L249 350 L163 308 M439 278 L519 350 L605 308"/>
      <path d="M340 436 L305 576 L267 653 L329 653 M428 436 L463 576 L501 653 L439 653"/>
      <path d="M355 168 L355 176 M413 168 L413 176 M356 210 Q384 235 412 210"/>
    `),
  },
  {
    id: 'cat',
    ...drawing(`
      <path d="M242 345 Q343 275 507 339 L507 474 L241 474 Z" fill="#f9d888"/>
      <path d="M226 324 L202 198 L274 240 Q314 223 350 241 L401 198 L410 324 Q326 392 226 324 Z" fill="#f9d888"/>
      <path d="M252 474 L252 601 L292 601 L292 474 M342 474 L342 579 L373 579 L373 474
        M416 474 L416 579 L447 579 L447 474 M477 474 L477 601 L517 601 L517 423"/>
      <path d="M508 362 Q626 364 589 229 Q562 173 541 223"/>
      <path d="M268 280 L268 289 M352 280 L352 289 M300 312 L316 312 L308 323 Z"/>
      <path d="M308 323 Q290 344 277 327 M308 323 Q326 344 339 327
        M251 314 L187 295 M251 331 L184 337 M362 314 L426 295 M362 331 L429 337"/>
    `),
  },
  {
    id: 'dog',
    ...drawing(`
      <path d="M252 340 Q370 287 526 340 L526 476 L251 476 Z" fill="#b9dce8"/>
      <path d="M218 257 Q268 219 333 257 L356 346 Q316 390 244 351 Z" fill="#b9dce8"/>
      <path d="M225 261 Q154 229 172 347 Q193 375 236 325 Z" fill="#ecc7a2"/>
      <path d="M270 279 L270 288 M308 279 L308 288 M287 312 L302 312 L295 323 Z
        M295 323 Q288 345 271 332"/>
      <path d="M255 476 L255 599 L299 599 L299 476 M347 476 L347 580 L381 580 L381 476
        M423 476 L423 580 L457 580 L457 476 M492 476 L492 599 L536 599 L536 431"/>
      <path d="M527 354 Q593 344 598 265"/>
    `),
  },
  {
    id: 'rocket',
    ...drawing(`
      <path d="M294 481 L294 304 Q306 182 384 105 Q462 182 474 304 L474 481 Z" fill="#b9dce8"/>
      <path d="M323 192 Q384 207 445 192 M294 421 L474 421"/>
      <circle cx="384" cy="313" r="47" fill="#f9d888"/>
      <path d="M294 365 L219 459 L219 544 L294 499 Z M474 365 L549 459 L549 544 L474 499 Z" fill="#f8b5a0"/>
      <path d="M329 481 L439 481 L424 517 L344 517 Z"/>
      <path d="M344 530 Q325 592 363 664 L384 611 L405 664 Q443 592 424 530" fill="#f9d888"/>
    `),
  },
  {
    id: 'flower',
    ...drawing(`
      <path d="M384 362 L384 655"/>
      <path d="M384 525 Q247 529 237 434 Q354 430 384 525 Z
        M384 585 Q525 589 535 489 Q418 486 384 585 Z" fill="#b9dfc5"/>
      <path d="M342 229 C255 113 392 72 414 196 C511 83 583 203 466 252
        C609 276 549 403 447 337 C485 482 333 477 342 352
        C226 425 175 286 307 265 C171 222 251 112 342 229 Z" fill="#f8b5a0"/>
      <circle cx="384" cy="277" r="67" fill="#f9d888"/>
      <path d="M359 266 L359 274 M409 266 L409 274 M360 301 Q384 319 408 301"/>
    `),
  },
  {
    id: 'fish',
    ...drawing(`
      <path d="M286 360 L152 261 L152 507 L286 408 Z" fill="#b9dce8"/>
      <path d="M312 311 Q363 215 443 285 M328 465 Q377 552 444 477" fill="#f9d888"/>
      <path d="M261 384 Q365 218 568 316 Q634 345 656 384 Q634 423 568 452
        Q365 550 261 384 Z" fill="#f8b5a0"/>
      <path d="M496 299 Q457 384 496 469 M648 384 L612 384"/>
      <circle cx="550" cy="359" r="12" fill="#252525"/>
      <path d="M379 340 Q429 384 379 428"/>
    `),
  },
  {
    id: 'butterfly',
    ...drawing(`
      <path d="M373 354 C307 216 164 200 156 298 C150 363 231 384 156 438
        C184 536 321 475 373 411 Z" fill="#f8b5a0"/>
      <path d="M395 354 C461 216 604 200 612 298 C618 363 537 384 612 438
        C584 536 447 475 395 411 Z" fill="#b9dce8"/>
      <path d="M373 354 Q297 300 245 287 M373 378 Q286 393 238 449
        M395 354 Q471 300 523 287 M395 378 Q482 393 530 449"/>
      <path d="M368 324 Q337 270 307 263 M400 324 Q431 270 461 263"/>
      <ellipse cx="384" cy="384" rx="22" ry="104" fill="#f9d888"/>
      <circle cx="269" cy="335" r="18" fill="#f9d888"/>
      <circle cx="499" cy="335" r="18" fill="#f8b5a0"/>
    `),
  },
  {
    id: 'house',
    ...drawing(`
      <path d="M171 361 L384 176 L597 361 L555 398 L555 615 L213 615 L213 398 Z" fill="#f8b5a0"/>
      <path d="M142 365 L384 153 L626 365 L590 405 L384 225 L178 405 Z" fill="#e63946"/>
      <path d="M344 615 L344 454 Q344 414 384 414 Q424 414 424 454 L424 615 Z" fill="#b9dce8"/>
      <rect x="245" y="405" width="76" height="76" rx="8" fill="#b9dce8"/>
      <rect x="447" y="405" width="76" height="76" rx="8" fill="#b9dce8"/>
      <path d="M283 405 L283 481 M245 443 L321 443 M447 443 L523 443 M485 405 L485 481"/>
      <path d="M384 153 L384 89 L470 89 L470 231"/>
      <circle cx="606" cy="157" r="42" fill="#f9d888"/>
    `),
  },
  {
    id: 'car',
    ...drawing(`
      <path d="M154 452 L180 362 Q195 326 237 326 L307 326 L368 248 L514 248
        Q553 248 578 291 L627 375 L646 452 L621 494 L162 494 Z" fill="#b9dce8"/>
      <path d="M272 326 L328 262 L398 262 L398 326 Z M420 262 L506 262
        Q531 262 546 291 L567 326 L420 326 Z" fill="#f9d888"/>
      <path d="M162 418 L637 418 M180 452 L221 452 M577 452 L622 452"/>
      <circle cx="263" cy="489" r="54" fill="#f9d888"/>
      <circle cx="263" cy="489" r="23" fill="white"/>
      <circle cx="524" cy="489" r="54" fill="#f9d888"/>
      <circle cx="524" cy="489" r="23" fill="white"/>
      <path d="M178 376 L229 376 M590 374 L628 374"/>
    `),
  },
  {
    id: 'dinosaur',
    ...drawing(`
      <path d="M193 397 Q209 300 326 293 L385 253 L419 293 Q503 285 542 357
        L622 404 L617 461 L527 430 L503 505 L503 604 L456 604 L440 496
        L362 499 L341 604 L294 604 L296 472 Q233 451 193 397 Z" fill="#b9dfc5"/>
      <path d="M324 294 L306 231 L351 268 L371 211 L399 267 L441 228 L432 295" fill="#f9d888"/>
      <path d="M232 370 Q190 317 169 357 Q159 392 218 411"/>
      <circle cx="467" cy="334" r="13" fill="#f9d888"/>
      <path d="M484 381 Q514 401 540 382"/>
      <path d="M300 605 L287 626 L350 626 L341 605 M457 605 L446 626 L509 626 L503 605"/>
    `),
  },
  {
    id: 'bird',
    ...drawing(`
      <path d="M259 424 Q247 303 354 265 Q464 226 530 316 Q581 384 523 464
        Q463 546 345 501 Q291 481 259 424 Z" fill="#f9d888"/>
      <path d="M363 361 Q449 307 500 371 Q457 436 363 421 Z" fill="#f8b5a0"/>
      <path d="M521 330 L613 360 L528 388 Z" fill="#e63946"/>
      <circle cx="487" cy="325" r="13" fill="#252525"/>
      <path d="M326 482 L313 568 M420 501 L430 568 M291 568 L340 568 M407 568 L451 568"/>
      <path d="M264 386 Q206 351 194 313 M266 423 Q206 419 181 438"/>
      <path d="M344 271 Q320 222 350 197 M382 258 Q382 215 417 195"/>
    `),
  },
  {
    id: 'rabbit',
    ...drawing(`
      <path d="M288 266 Q220 88 280 81 Q334 75 348 259 M408 259 Q416 79 469 91
        Q520 104 453 294" fill="#f8b5a0"/>
      <ellipse cx="375" cy="365" rx="142" ry="137" fill="#f9d888"/>
      <ellipse cx="375" cy="501" rx="111" ry="91" fill="#f8b5a0"/>
      <ellipse cx="287" cy="598" rx="62" ry="38" fill="#b9dce8"/>
      <ellipse cx="462" cy="598" rx="62" ry="38" fill="#b9dce8"/>
      <circle cx="326" cy="340" r="14" fill="#252525"/>
      <circle cx="423" cy="340" r="14" fill="#252525"/>
      <path d="M362 388 Q375 374 388 388 Q375 408 362 388 Z" fill="#e63946"/>
      <path d="M375 407 Q350 433 331 411 M375 407 Q400 433 419 411"/>
      <circle cx="275" cy="397" r="20" fill="#f8b5a0"/>
      <circle cx="475" cy="397" r="20" fill="#f8b5a0"/>
    `),
  },
  {
    id: 'elephant',
    ...drawing(`
      <path d="M233 344 Q250 237 375 235 Q503 234 534 345 L517 526 L464 526
        L451 435 L314 435 L300 526 L247 526 Z" fill="#b9dce8"/>
      <path d="M511 341 Q592 333 594 410 Q596 480 555 501 Q535 511 536 469
        Q542 437 514 426" fill="#b9dce8"/>
      <ellipse cx="238" cy="347" rx="67" ry="93" fill="#f8b5a0"/>
      <ellipse cx="241" cy="348" rx="36" ry="59" fill="#f9d888"/>
      <circle cx="424" cy="323" r="13" fill="#252525"/>
      <path d="M495 393 Q526 411 554 394"/>
      <path d="M317 526 L306 591 L360 591 L357 526 M448 526 L445 591 L499 591 L489 526"/>
      <path d="M323 591 L298 603 L364 603 M451 591 L431 603 L505 603"/>
    `),
  },
  {
    id: 'lion',
    ...drawing(`
      <circle cx="381" cy="383" r="224" fill="#f9d888"/>
      <path d="M267 319 Q285 244 379 241 Q478 242 498 319 L477 453
        Q438 507 381 507 Q322 507 281 453 Z" fill="#f8b5a0"/>
      <path d="M269 319 Q216 287 234 381 Q237 415 281 421 M492 319 Q546 287 528 381 Q525 415 479 421" fill="#f9d888"/>
      <circle cx="331" cy="353" r="15" fill="#252525"/>
      <circle cx="430" cy="353" r="15" fill="#252525"/>
      <path d="M364 397 Q381 382 398 397 Q381 420 364 397 Z" fill="#252525"/>
      <path d="M381 418 Q355 450 329 428 M381 418 Q407 450 433 428"/>
      <path d="M288 397 L223 383 M291 421 L221 435 M475 397 L540 383 M472 421 L542 435"/>
      <path d="M302 527 L282 579 L330 579 M460 527 L480 579 L432 579"/>
    `),
  },
  {
    id: 'turtle',
    ...drawing(`
      <path d="M202 423 Q208 305 384 286 Q560 305 566 423 Q555 519 384 528
        Q213 519 202 423 Z" fill="#b9dfc5"/>
      <path d="M254 423 Q260 331 384 320 Q508 331 514 423 Q503 492 384 499
        Q265 492 254 423 Z" fill="#f9d888"/>
      <path d="M384 323 L384 498 M265 416 L503 416 M306 351 L345 385
        M462 351 L423 385 M306 470 L345 441 M462 470 L423 441"/>
      <circle cx="595" cy="414" r="61" fill="#b9dfc5"/>
      <circle cx="617" cy="396" r="10" fill="#252525"/>
      <path d="M576 447 Q598 466 621 446"/>
      <path d="M245 483 Q215 548 274 558 Q318 556 320 503
        M448 503 Q450 556 494 558 Q553 548 523 483"/>
      <path d="M207 382 L153 349 L164 431 Z" fill="#b9dfc5"/>
    `),
  },
  {
    id: 'bear',
    ...drawing(`
      <circle cx="286" cy="247" r="68" fill="#b9825b"/>
      <circle cx="482" cy="247" r="68" fill="#b9825b"/>
      <circle cx="286" cy="247" r="31" fill="#f8b5a0"/>
      <circle cx="482" cy="247" r="31" fill="#f8b5a0"/>
      <path d="M239 384 Q238 263 384 255 Q530 263 529 384 L514 530
        Q493 626 384 626 Q275 626 254 530 Z" fill="#b9825b"/>
      <ellipse cx="384" cy="423" rx="102" ry="79" fill="#f9d888"/>
      <circle cx="328" cy="365" r="14" fill="#252525"/>
      <circle cx="440" cy="365" r="14" fill="#252525"/>
      <ellipse cx="384" cy="414" rx="28" ry="19" fill="#252525"/>
      <path d="M384 432 Q359 462 336 440 M384 432 Q409 462 432 440"/>
      <path d="M286 502 Q223 479 228 539 Q236 590 300 561
        M482 502 Q545 479 540 539 Q532 590 468 561"/>
      <path d="M312 594 L302 628 L358 628 M456 594 L466 628 L410 628"/>
    `),
  },
  {
    id: 'baby',
    ...drawing(`
      <path d="M245 432 Q231 320 287 277 Q326 248 384 248 Q442 248 481 277
        Q537 320 523 432 L504 563 L264 563 Z" fill="#b9dce8"/>
      <circle cx="384" cy="330" r="138" fill="#f9d888"/>
      <path d="M252 308 Q246 192 384 180 Q522 192 516 308
        Q461 261 384 263 Q307 261 252 308 Z" fill="#f8b5a0"/>
      <path d="M336 330 L336 340 M432 330 L432 340"/>
      <path d="M358 389 Q384 416 410 389"/>
      <circle cx="316" cy="374" r="20" fill="#f8b5a0"/>
      <circle cx="452" cy="374" r="20" fill="#f8b5a0"/>
      <path d="M295 563 L295 624 L473 624 L473 563" fill="#f8b5a0"/>
      <path d="M350 477 L418 477 M384 443 L384 510"/>
      <path d="M300 280 Q278 205 326 180 M468 280 Q490 205 442 180"/>
    `),
  },
  {
    id: 'cartoon',
    ...drawing(`
      <rect x="221" y="239" width="326" height="322" rx="88" fill="#b9dce8"/>
      <path d="M384 168 L384 239 M326 168 L442 168"/>
      <circle cx="384" cy="153" r="26" fill="#f8b5a0"/>
      <rect x="273" y="312" width="222" height="110" rx="42" fill="#ffffff"/>
      <circle cx="333" cy="365" r="20" fill="#2b7de9"/>
      <circle cx="435" cy="365" r="20" fill="#2b7de9"/>
      <path d="M334 455 Q384 502 434 455"/>
      <path d="M221 340 L158 389 L221 427 M547 340 L610 389 L547 427" fill="#f9d888"/>
      <path d="M294 561 L274 638 L344 638 L355 561
        M413 561 L424 638 L494 638 L474 561" fill="#f8b5a0"/>
      <path d="M300 638 L263 654 L349 654 M420 638 L507 654 L470 638"/>
      <path d="M324 270 L346 281 M444 270 L422 281"/>
    `),
  },
] as const;

export type SampleDrawing = (typeof SAMPLES)[number];
export type SampleVariant = 'outline' | 'colored';

/** Rasterise local SVG artwork so the upload uses the same PNG format as the sketchpad. */
export async function sampleToBlob(
  sample: SampleDrawing,
  variant: SampleVariant = 'colored',
): Promise<Blob> {
  const image = new Image();
  image.src = variant === 'colored' ? sample.src : sample.outlineSrc;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create sample canvas');
  ctx.drawImage(image, 0, 0);
  return canvasToBlob(canvas, 'image/png');
}
