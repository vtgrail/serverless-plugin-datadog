import * as Serverless from "serverless";
import { FunctionInfo } from "./layer";

const yellowFont = "\x1b[33m";
const underlineFont = "\x1b[4m";
const endFont = "\x1b[0m";
const outputPrefix = "DatadogMonitor";

/**
 * Builds the CloudFormation Outputs containing the alphanumeric key, description,
 * and value (URL) to the function in Datadog
 */
export async function addOutputLinks(
  serverless: Serverless,
  site: string,
  subdomain: string,
  handlers: FunctionInfo[],
) {
  const awsAccount = await serverless.getProvider("aws").getAccountId();
  const region = serverless.service.provider.region;
  const outputs = serverless.service.provider.compiledCloudFormationTemplate?.Outputs;
  if (outputs === undefined) {
    return;
  }

  handlers.forEach(({ name, handler }) => {
    const functionName = handler.name;
    const key = `${outputPrefix}${name}`.replace(/[^a-z0-9]/gi, "");
    outputs[key] = {
      Description: `See ${name} in Datadog`,
      Value: `https://${subdomain}.${site}/functions/${functionName}:${region}:${awsAccount}:aws?source=sls-plugin`,
    };
  });
}

export async function printOutputs(serverless: Serverless, site: string, subdomain: string) {
  const stackName = serverless.getProvider("aws").naming.getStackName();
  const service = serverless.service.getServiceName();
  const env = serverless.getProvider("aws").getStage();
  const describeStackOutput = await serverless
    .getProvider("aws")
    .request(
      "CloudFormation",
      "describeStacks",
      { StackName: stackName },
      { region: serverless.getProvider("aws").getRegion() },
    )
    .catch(() => {
      // Ignore any request exceptions, fail silently and skip output logging
    });
  if (describeStackOutput === undefined) {
    return;
  }

  logHeader("Datadog Monitoring", true);
  logHeader("functions");

  for (const output of describeStackOutput.Stacks[0].Outputs) {
    if (output.OutputKey.startsWith(outputPrefix)) {
      const key = output.OutputKey.substring(outputPrefix.length);
      logMessage(`${key}: ${output.OutputValue}`);
    }
  }
  logHeader("View Serverless Monitors", true);
  logMessage(
    `https://${subdomain}.${site}/monitors/manage?q=tag%3A%28%22env%3A${env}%22AND%22service%3A${service}%22%29`,
  );
}

function logHeader(message: string, underline = false) {
  const startFont = underline ? `${yellowFont}${underlineFont}` : `${yellowFont}`;
  console.log(`${startFont}${message}${endFont}`);
}

function logMessage(message: string) {
  console.log(`  ${message}`);
}
