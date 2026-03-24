import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.SecureRandom;
import java.util.HexFormat;

public class PassGen {
    public static void main(String[] args) throws Exception {
        String password = "admin";
        byte[] salt = new byte[24];
        new SecureRandom().nextBytes(salt);
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, 1000, 24 * 8);
        byte[] hash = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA1").generateSecret(spec).getEncoded();
        System.out.println("SALT: " + HexFormat.of().formatHex(salt));
        System.out.println("HASH: " + HexFormat.of().formatHex(hash));
    }
}
