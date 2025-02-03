import { writeFileSync } from "fs";
const TOTAL_PRODUCTS = 500_000;

interface TestData {
	name: string;
	price: number;
}

let output: TestData[] = [];
for (let i = 0; i < TOTAL_PRODUCTS; i++) {
	output.push({
		name: `Product ${i}`,
		price: Math.floor(Math.random() * 10000),
	});
}

writeFileSync(
	"data.json",
	JSON.stringify({
		data: output,
	})
);
