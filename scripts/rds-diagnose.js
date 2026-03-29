require('dotenv').config({ path: '.env.local' });
const { RDSClient, DescribeDBInstancesCommand, StartDBInstanceCommand } = require('@aws-sdk/client-rds');
const { EC2Client, DescribeSubnetsCommand, DescribeRouteTablesCommand, DescribeNetworkAclsCommand } = require('@aws-sdk/client-ec2');

const creds = {
  region: 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const rds = new RDSClient(creds);
const ec2 = new EC2Client(creds);

async function main() {
  console.log('\n=== RDS INSTANCE STATUS ===');
  const { DBInstances } = await rds.send(new DescribeDBInstancesCommand({
    DBInstanceIdentifier: 'dermasense-db',
  }));

  const db = DBInstances[0];
  console.log('Status:          ', db.DBInstanceStatus);
  console.log('Publicly Accessible:', db.PubliclyAccessible);
  console.log('Endpoint:        ', db.Endpoint?.Address + ':' + db.Endpoint?.Port);
  console.log('VPC ID:          ', db.DBSubnetGroup?.VpcId);
  console.log('Subnet Group:    ', db.DBSubnetGroup?.DBSubnetGroupName);
  console.log('Security Groups: ', db.VpcSecurityGroups.map(sg => sg.VpcSecurityGroupId + ' (' + sg.Status + ')').join(', '));

  const subnetIds = db.DBSubnetGroup?.Subnets?.map(s => s.SubnetIdentifier) || [];
  console.log('Subnets:         ', subnetIds.join(', '));

  if (db.DBInstanceStatus !== 'available') {
    console.log('\n⚠️  RDS IS NOT RUNNING! Status:', db.DBInstanceStatus);
    if (db.DBInstanceStatus === 'stopped') {
      console.log('Starting RDS instance...');
      await rds.send(new StartDBInstanceCommand({ DBInstanceIdentifier: 'dermasense-db' }));
      console.log('✅ Start command sent! Wait 3-5 minutes then re-run node scripts/quick-test.js');
    }
    return;
  }

  console.log('\n=== SUBNET ROUTE TABLES ===');
  const { RouteTables } = await ec2.send(new DescribeRouteTablesCommand({
    Filters: [{ Name: 'association.subnet-id', Values: subnetIds }],
  }));

  let hasIGW = false;
  for (const rt of RouteTables) {
    console.log('Route Table:', rt.RouteTableId);
    for (const route of rt.Routes) {
      const dest = route.DestinationCidrBlock || route.DestinationIpv6CidrBlock;
      const target = route.GatewayId || route.NatGatewayId || route.TransitGatewayId || 'local';
      console.log(' ', dest, '->', target);
      if (dest === '0.0.0.0/0' && route.GatewayId?.startsWith('igw-')) {
        hasIGW = true;
        console.log('  ✅ Internet Gateway route found!');
      }
    }
  }

  if (!hasIGW) {
    console.log('\n❌ NO Internet Gateway route! The subnet is PRIVATE — packets cannot reach internet.');
    console.log('   Fix: Go to VPC Console → Route Tables → Find route table for RDS subnet');
    console.log('        Add route: 0.0.0.0/0 → igw-xxxxxxxx (your Internet Gateway)');
  } else {
    console.log('\n✅ Internet Gateway route exists.');
    console.log('\n=== NETWORK ACL CHECK ===');
    const { NetworkAcls } = await ec2.send(new DescribeNetworkAclsCommand({
      Filters: [{ Name: 'association.subnet-id', Values: subnetIds }],
    }));
    for (const acl of NetworkAcls) {
      console.log('NACL:', acl.NetworkAclId);
      console.log('  Inbound rules:');
      acl.Entries.filter(e => !e.Egress).sort((a, b) => a.RuleNumber - b.RuleNumber).forEach(e => {
        console.log(`    Rule ${e.RuleNumber}: ${e.Protocol === '-1' ? 'ALL' : 'TCP'} port ${e.PortRange ? e.PortRange.From + '-' + e.PortRange.To : 'ALL'} -> ${e.RuleAction}`);
      });
      console.log('  Outbound rules:');
      acl.Entries.filter(e => e.Egress).sort((a, b) => a.RuleNumber - b.RuleNumber).forEach(e => {
        console.log(`    Rule ${e.RuleNumber}: ${e.Protocol === '-1' ? 'ALL' : 'TCP'} port ${e.PortRange ? e.PortRange.From + '-' + e.PortRange.To : 'ALL'} -> ${e.RuleAction}`);
      });
    }
  }
}

main().catch(e => {
  console.error('Diagnostic error:', e.message);
  if (e.message.includes('not authorized') || e.message.includes('Access Denied')) {
    console.log('\n⚠️  IAM permission issue - the IAM user may not have RDS/EC2 describe permissions');
  }
});
