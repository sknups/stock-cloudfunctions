import * as seedrandom from "seedrandom";

export class RandomIssuePicker {

  private static shuffled = new Map<string,number[]>();

  public issue(maximum: number, sku: string, issued: number): number {

    if (!RandomIssuePicker.shuffled[sku]) {
        const issues = Array.from({ length: maximum }, (_, index) => index + 1);

        //ARC4-based PRNG
        //ARC4 key scheduler cycles short keys, 
        //library recommends adding terminating string
        const random = seedrandom(`${sku}\0`);

        for (let index = issues.length - 1; index > 0; index--) {
          const newIndex = Math.floor(random() * (index + 1));
          [issues[index], issues[newIndex]] = [issues[newIndex], issues[index]];
        }

        RandomIssuePicker.shuffled[sku] = issues;
    }

    return RandomIssuePicker.shuffled[sku][issued - 1];
  }
}
