namespace CREAPDBridge;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        ProtocolRegistration.EnsureRegistered();

        var pairingUri = args.FirstOrDefault(arg =>
            arg.StartsWith("creapd-obs://", StringComparison.OrdinalIgnoreCase));

        Application.Run(new BridgeForm(pairingUri));
    }
}
