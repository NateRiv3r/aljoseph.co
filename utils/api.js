import fs from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { getCache, setCache } from './redis';

const postDirectory = join(process.cwd(), '_posts');

export function getPostSlugs() {
	return fs.readdirSync(postDirectory);
}

export function getPostBySlug(slug, fields = []) {
	const realSlug = slug.replace(/\.md$/, '');
	const fullPath = join(postDirectory, `${realSlug}.md`);
	const fileContents = fs.readFileSync(fullPath, 'utf8');
	const { data, content } = matter(fileContents);

	const items = {};

	fields.forEach((field) => {
		if (field === 'slug') {
			items[field] = realSlug;
		}

		if (field === 'content') {
			items[field] = content;
		}

		if (data[field]) {
			items[field] = data[field];
		}
	});

	return items;
}

export function getAllPosts(fields = []) {
	const slugs = getPostSlugs();
	const posts = slugs
		.map((slug) => getPostBySlug(slug, fields))
		.sort((post1, post2) => (post1.date > post2.date ? '-1' : '1'));

	return posts;
}

export async function getPagination(pageSlug) {
	let posts = await getCache('posts');

	if (posts === null) {
		posts = getAllPosts(['slug', 'date', 'title']);
		setCache('posts', posts);
	}

	const slugs = posts && posts.map(({ slug }) => slug);
	const postsTitle = posts && posts.map(({ title }) => title);

	const totalPages = posts.length;
	const current = slugs.indexOf(pageSlug) + 1;

	let prev = undefined;
	let next = undefined;

	if (totalPages > 1) {
		if (current === 1) {
			next = 2;
			prev = undefined;
		}
		if (current > 1) {
			next = current + 1;
			prev = current - 1;
		}
		if (current === totalPages) {
			prev = totalPages - 1;
			next = undefined;
		}
	}
	return {
		prevPage: {
			url: slugs[prev - 1] || null,
			title: postsTitle[prev - 1] || null
		},
		nextPage: {
			url: slugs[next - 1] || null,
			title: postsTitle[next - 1] || null
		}
	};
}
