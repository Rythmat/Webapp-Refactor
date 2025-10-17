import capitalize from 'lodash/capitalize';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { generateApi } from 'swagger-typescript-api';

const API_NAME = 'MusicAtlas';
const API_URL = process.env.VITE_MUSIC_ATLAS_API_URL;
const OUTPUT_DIR = path.resolve(
  process.cwd(),
  './src/contexts/MusicAtlasContext',
);

if (!API_URL) {
  throw new Error('VITE_MUSIC_ATLAS_API_URL is not set.');
}

async function main() {
  const response = await fetch(`${API_URL}/swagger/json`);
  const data = await response.json();

  await generateApi({
    url: `${API_URL}/swagger/json`,
    name: `${API_NAME}.generated.ts`,
    spec: data.json,
    output: OUTPUT_DIR,
    httpClientType: 'axios',
    // defaultResponseAsSuccess: true,
    generateClient: true,
    generateRouteTypes: true,
    generateResponses: true,
    extractRequestParams: true,
    extractRequestBody: true,
    extractResponseBody: true,
    extractEnums: true,
    unwrapResponseData: true,
    defaultResponseType: 'void',
    singleHttpClient: true,
    cleanOutput: false,
    enumNamesAsValues: true,
    moduleNameFirstTag: true,
    generateUnionEnums: true,
    addReadonly: true,
    // typePrefix: '',
    // typeSuffix: '',
    // enumKeyPrefix: '',
    // enumKeySuffix: '',
    sortTypes: true,
    sortRoutes: true,
    // extractingOptions: {
    //   requestBodySuffix: ['Payload', 'Body', 'Input'],
    //   requestParamsSuffix: ['Params'],
    //   responseBodySuffix: ['Data', 'Result', 'Output'],
    //   responseErrorSuffix: [
    //     'Error',
    //     'Fail',
    //     'Fails',
    //     'ErrorData',
    //     'HttpError',
    //     'BadResponse',
    //   ],
    // },
    /** allow to generate extra files based with this extra templates, see more below */
    // extraTemplates: [],
    fixInvalidTypeNamePrefix: 'Type',
    fixInvalidEnumKeyPrefix: 'Value',
    // codeGenConstructs: (constructs) => ({
    //   ...constructs,
    //   RecordType: (key, value) => `MyRecord<key, value>`,
    // }),
    // primitiveTypeConstructs: (constructs) => ({
    //   ...constructs,
    //   string: {
    //     $default: 'string',
    //     'date': 'Date',
    //   },
    // }),
    // hooks: {
    //   //   onCreateComponent: (component) => {},
    //   //   onCreateRequestParams: (rawType) => {},
    //   //   onCreateRoute: (routeData) => {},
    //   //   onCreateRouteName: (routeNameInfo, rawRouteInfo) => {},
    //   onFormatRouteName: (routeInfo, templateRouteName) => {
    //     /**
    //      * Route names are verbControllerMethod name, but they are already scoped by controller
    //      * so we need to remove the controller name from the route name so we return verbMethod.
    //      */

    //     return templateRouteName.replace(capitalize(routeInfo.moduleName), '');
    //   },
    //   //   onFormatTypeName: (typeName, rawTypeName, schemaType) => {},
    //   //   onInit: (configuration) => {},
    //   //   onPreParseSchema: (originalSchema, typeName, schemaType) => {},
    //   //   onParseSchema: (originalSchema, parsedSchema) => {},
    //   //   onPrepareConfig: (currentConfiguration) => {},
    // },
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });

  // replace "date | Date | string | number" with "Date" on the output file
  const filePath = path.resolve(OUTPUT_DIR, `${API_NAME}.generated.ts`);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const updatedContent = fileContent.replace(
    /date \| string \| number/g,
    'Date',
  );
  fs.writeFileSync(filePath, updatedContent);
}

main();
