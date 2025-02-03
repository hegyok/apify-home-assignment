import Fastify from "fastify";
import { data } from "./data.json";

interface ProductsQuery {
	minPrice: string;
	maxPrice: string;
}

interface Product {
	name: string;
	price: number;
}

const fastify = Fastify();

fastify.get("/products", (req, res) => {
	const { minPrice, maxPrice } = <ProductsQuery>req.query;
	const minPriceNumber = parseInt(minPrice);
	const maxPriceNumber = parseInt(maxPrice);

	if (minPriceNumber < 0 || maxPriceNumber < 0) {
		return res.status(400).send({
			error: "Prices cannot be negative",
		});
	}

	if (minPriceNumber > maxPriceNumber) {
		return res.status(400).send({
			error: "minPrice cannot be greater than maxPrice",
		});
	}

	//Filter products based on minPrice and maxPrice
	const products: Product[] = data.filter(
		(p) => p.price >= minPrice && p.price <= maxPrice
	);

	//Limit response to only 1000 products
	const filteredProducts: Product[] = products.slice(0, 1000);

	res.send({
		total: products.length,
		count: filteredProducts.length,
		products: filteredProducts,
	});
});

fastify.listen({
	host: "::",
	port: 80,
});
