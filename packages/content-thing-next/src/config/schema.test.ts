import { describe, it, expect, assert } from 'vitest';
import type { CollectionConfig, CollectionConfigMap } from './types.js';
import { validateSchemaRelations } from './schema.js';

type CollectionFields = CollectionConfig['data']['fields'][string];
type Fields = {
	[x: string]: Omit<CollectionFields, 'nullable'> & {
		nullable?: CollectionFields['nullable'];
	};
};
type Relations = CollectionConfig['data']['relations'];

// Helper function to create a CollectionConfig
function createConfig(fields: Fields, relations: Relations) {
	return {
		name: 'config',
		type: 'test',
		data: { fields, relations },
	} as CollectionConfig;
}

describe('validateSchemaRelations', () => {
	it('should pass with valid configuration', () => {
		const configMap: CollectionConfigMap = new Map([
			[
				'collection1',
				createConfig(
					{ field1: { type: 'text' } },
					{
						relation1: {
							type: 'one',
							collection: 'collection2',
							reference: 'field2',
							field: 'field1',
						},
					},
				),
			],
			['collection2', createConfig({ field2: { type: 'text' } }, {})],
		]);

		const result = validateSchemaRelations(configMap);
		assert(result.ok);
	});

	it('should fail when related collection is missing', () => {
		const configMap: CollectionConfigMap = new Map([
			[
				'collection1',
				createConfig(
					{ field1: { type: 'text' } },
					{
						relation1: {
							type: 'one',
							collection: 'missingCollection',
							reference: 'field2',
							field: 'field1',
						},
					},
				),
			],
		]);

		const result = validateSchemaRelations(configMap);
		assert(!result.ok);
		expect(result.error.issues).toEqual([
			{
				message:
					'Collection config of "collection1" references non-existent collection "missingCollection".',
			},
		]);
	});

	it('should fail when own field is missing', () => {
		const configMap: CollectionConfigMap = new Map([
			[
				'collection1',
				createConfig(
					{ field1: { type: 'text' } },
					{
						relation1: {
							type: 'one',
							collection: 'collection2',
							reference: 'field2',
							field: 'missingField',
						},
					},
				),
			],
			['collection2', createConfig({ field2: { type: 'text' } }, {})],
		]);

		const result = validateSchemaRelations(configMap);
		assert(!result.ok);
		expect(result.error.issues).toEqual([
			{
				message:
					'Collection config of "collection1" references non-existent field in own config. Expected one of: "field1".',
			},
		]);
	});

	it('should fail when related field is missing', () => {
		const configMap: CollectionConfigMap = new Map([
			[
				'collection1',
				createConfig(
					{ field1: { type: 'text' } },
					{
						relation1: {
							type: 'one',
							collection: 'collection2',
							reference: 'missingField',
							field: 'field1',
						},
					},
				),
			],
			['collection2', createConfig({ field2: { type: 'text' } }, {})],
		]);

		const result = validateSchemaRelations(configMap);
		assert(!result.ok);
		expect(result.error.issues).toEqual([
			{
				message:
					'Collection config of "collection1" references non-existent field "missingField" in "collection2" collection. Expected one of: "field2".',
			},
		]);
	});

	it('should pass when no relations defined', () => {
		const configMap: CollectionConfigMap = new Map([
			['collection1', createConfig({ field1: { type: 'text' } }, {})],
		]);

		const result = validateSchemaRelations(configMap);
		assert(result.ok);
	});

	it('should handle empty configuration map', () => {
		const configMap: CollectionConfigMap = new Map();
		const result = validateSchemaRelations(configMap);
		assert(result.ok);
	});

	it('should fail with missing related collection fields', () => {
		const configMap: CollectionConfigMap = new Map([
			[
				'collection1',
				createConfig(
					{ field1: { type: 'text' } },
					{
						relation1: {
							type: 'one',
							collection: 'collection2',
							reference: 'field2',
							field: 'field1',
						},
					},
				),
			],
			[
				'collection2',
				createConfig(
					{ field3: { type: 'text' } }, // field2 is missing
					{},
				),
			],
		]);

		const result = validateSchemaRelations(configMap);
		assert(!result.ok);
		expect(result.error.issues).toEqual([
			{
				message:
					'Collection config of "collection1" references non-existent field "field2" in "collection2" collection. Expected one of: "field3".',
			},
		]);
	});

	it('should fail with multiple errors in single config', () => {
		const configMap: CollectionConfigMap = new Map([
			[
				'collection1',
				createConfig(
					{ field1: { type: 'text' } },
					{
						relation1: {
							type: 'one',
							collection: 'missingCollection',
							reference: 'field2',
							field: 'missingField',
						},
						relation2: {
							type: 'one',
							collection: 'collection2',
							reference: 'missingField',
							field: 'field1',
						},
					},
				),
			],
			['collection2', createConfig({ field2: { type: 'text' } }, {})],
		]);

		const result = validateSchemaRelations(configMap);
		assert(!result.ok);
		expect(result.error.issues).toEqual([
			{
				message:
					'Collection config of "collection1" references non-existent collection "missingCollection".',
			},
			{
				message:
					'Collection config of "collection1" references non-existent field in own config. Expected one of: "field1".',
			},
			{
				message:
					'Collection config of "collection1" references non-existent field "missingField" in "collection2" collection. Expected one of: "field2".',
			},
		]);
	});

	it('should pass with circular relations', () => {
		const configMap: CollectionConfigMap = new Map([
			[
				'collection1',
				createConfig(
					{ field1: { type: 'text' } },
					{
						relation1: {
							type: 'one',
							collection: 'collection2',
							reference: 'field2',
							field: 'field1',
						},
					},
				),
			],
			[
				'collection2',
				createConfig(
					{ field2: { type: 'text' } },
					{
						relation2: {
							type: 'one',
							collection: 'collection1',
							reference: 'field1',
							field: 'field2',
						},
					},
				),
			],
		]);

		const result = validateSchemaRelations(configMap);
		assert(result.ok);
	});

	it('should pass with nullable fields in relations', () => {
		const configMap: CollectionConfigMap = new Map([
			[
				'collection1',
				createConfig(
					{
						field1: { type: 'text' },
						nullableField: { type: 'text', nullable: true },
					},
					{
						relation1: {
							type: 'one',
							collection: 'collection2',
							reference: 'field2',
							field: 'nullableField',
						},
					},
				),
			],
			['collection2', createConfig({ field2: { type: 'text' } }, {})],
		]);

		const result = validateSchemaRelations(configMap);
		assert(result.ok);
	});
});
