import { writeFileSync } from "fs";

const API_BASE = "http://testapi";

// We need to know the maximum possible price
const PRICE_LIMIT = 100_000;

// API will return only 1000 products at a time
const CHUNK_SIZE = 1000;

// I want to count how many requests I have made to the backend
let totalRequests = 0;

interface Product {
	name: string;
	price: number;
}

interface ApiResponse {
	total: number;
	count: number;
	products: Product[];
}

interface QueueItem {
	minPrice: number;
	maxPrice: number;
	partial: boolean; //Indicates if the chunk is partial or not
}

/**
 * Fetches products from the API.
 * Tries to fetch products in chunks of 1000, if the API returns more total products than the count
 * it will split the chunk to 2 halves and try to fetch them again.
 * Fetches data until we reach the maximum price (We don't need to know how many items are there in total)
 * @param minPrice The minimum price of the products to fetch.
 * @param maxPrice The maximum price of the products to fetch.
 * @returns A promise that resolves to the response from the API.
 */
async function fetchProducts(
	minPrice: number,
	maxPrice: number
): Promise<ApiResponse> {
	const response = await fetch(
		`${API_BASE}/products?minPrice=${minPrice}&maxPrice=${maxPrice}`
	);
	//Make sure that we get OK status
	if (!response.ok) {
		throw new Error("Failed to fetch products. Non-200 status code.");
	}

	//response.headers.get() could be null, so we need to handle it
	const contentType = response.headers.get("Content-Type") || "";
	if (!contentType.startsWith("application/json")) {
		//Check if the response is JSON
		throw new Error("Failed to fetch products. Invalid Content-Type.");
	}

	let json: ApiResponse;
	try {
		json = await response.json();
	} catch (e) {
		//Handle invalid JSON response
		console.error("Failed to parse response as JSON.");
		process.exit(1);
	}
	return json;
}

//Queue with all chunks to fetch
const queue: QueueItem[] = [];

async function scraper(): Promise<Product[]> {
	//Buffer with all the products
	let outputBuffer: Product[] = [];

	//Put the first chunk in the queue
	queue.push({
		minPrice: 0,
		maxPrice: CHUNK_SIZE,
		partial: false,
	});

	//Iterate as long as there are some items in the queue
	while (queue.length > 0) {
		const { minPrice, maxPrice, partial } = queue.shift();

		const products = await fetchProducts(minPrice, maxPrice);
		totalRequests++;

		//If the chunk is not partial, we want to queue another chunk
		if (!partial) {
			queue.push({
				minPrice: maxPrice + 1,
				maxPrice: maxPrice + CHUNK_SIZE,
				partial: false,
			});
		}

		//Handle a case when we reach the API limit
		if (products.total > products.count) {
			//Calculate the middle price
			const midPrice = Math.floor((minPrice + maxPrice) / 2);

			//queue left partial range
			queue.push({
				minPrice: minPrice,
				maxPrice: midPrice,
				partial: true,
			});

			//queue right partial range
			queue.push({
				minPrice: midPrice + 1, // +1 so that we don't get any duplicates
				maxPrice: maxPrice,
				partial: true,
			});
			continue;
		}
		outputBuffer.push(...products.products); // Push fetched products to buffer
		if (maxPrice >= PRICE_LIMIT) {
			// If we cross the price limit, break
			break;
		}
	}
	return outputBuffer;
}

async function start() {
	console.log("Scraping...");
	const startTime = Date.now();
	const results = await scraper();
	console.log(`took ${Date.now() - startTime}ms`);
	console.log(`Done with ${totalRequests} requests`);
	console.log(`${results.length} items scraped`);

	//Write the results to output.json
	writeFileSync("output.json", JSON.stringify(results));
}
start();
