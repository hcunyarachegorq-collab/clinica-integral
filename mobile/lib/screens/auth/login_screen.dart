import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../core/api_config.dart';
import '../../core/app_theme.dart';
import '../../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  final bool initialRegister;
  const LoginScreen({super.key, this.initialRegister = false});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late bool _isRegisterMode;

  // Claves y controladores para Login
  final _loginFormKey = GlobalKey<FormState>();
  final _loginEmailController = TextEditingController();
  final _loginPasswordController = TextEditingController();
  bool _obscureLoginPassword = true;
  bool _rememberMe = true;

  // Claves y controladores para Registro
  final _registerFormKey = GlobalKey<FormState>();
  final _registerNameController = TextEditingController();
  final _registerEmailController = TextEditingController();
  final _registerPhoneController = TextEditingController();
  final _registerPasswordController = TextEditingController();
  final _registerConfirmPasswordController = TextEditingController();
  bool _obscureRegisterPassword = true;
  bool _obscureRegisterConfirmPassword = true;

  bool _showDemoPills = false;

  @override
  void initState() {
    super.initState();
    _isRegisterMode = widget.initialRegister;
  }

  @override
  void dispose() {
    _loginEmailController.dispose();
    _loginPasswordController.dispose();
    _registerNameController.dispose();
    _registerEmailController.dispose();
    _registerPhoneController.dispose();
    _registerPasswordController.dispose();
    _registerConfirmPasswordController.dispose();
    super.dispose();
  }

  void _fillDemo(String email, String pass, String roleName) {
    setState(() {
      _loginEmailController.text = email;
      _loginPasswordController.text = pass;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Credencial $roleName cargada'),
        backgroundColor: const Color(0xFF0284C7),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // Envío del Login
  Future<void> _submitLogin() async {
    if (!_loginFormKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final success = await auth.login(
      _loginEmailController.text.trim(),
      _loginPasswordController.text,
    );

    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.errorMessage ?? 'Error al iniciar sesión'),
          backgroundColor: AppTheme.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  // Envío del Registro
  Future<void> _submitRegister() async {
    if (!_registerFormKey.currentState!.validate()) return;

    if (_registerPasswordController.text != _registerConfirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Las contraseñas no coinciden'),
          backgroundColor: AppTheme.warning,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    final success = await auth.register(
      fullName: _registerNameController.text.trim(),
      email: _registerEmailController.text.trim(),
      password: _registerPasswordController.text,
      phone: _registerPhoneController.text.trim().isNotEmpty
          ? _registerPhoneController.text.trim()
          : null,
    );

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Cuenta creada exitosamente!'),
            backgroundColor: Color(0xFF0D9488),
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.errorMessage ?? 'Error al registrar la cuenta'),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  // Diálogo de configuración del Servidor REST Backend
  Future<void> _showServerConfigDialog() async {
    final urlController = TextEditingController(text: ApiConfig.baseUrl);
    bool isTesting = false;
    String? testResult;
    bool testSuccess = false;

    await showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: const Color(0xFFEEF4FA),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F2FE),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.dns_rounded, color: Color(0xFF0284C7), size: 22),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Servidor Backend',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Dirección URL de la API REST:',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: urlController,
                  keyboardType: TextInputType.url,
                  style: const TextStyle(fontSize: 14, color: Color(0xFF0F172A)),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.link_rounded, size: 20, color: Color(0xFF0284C7)),
                    hintText: 'http://192.168.1.33:4000',
                    filled: true,
                    fillColor: const Color(0xFFEAF0F6),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.8)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.8)),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Accesos rápidos:',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    ActionChip(
                      label: const Text('Wi-Fi LAN (PC)', style: TextStyle(fontSize: 11)),
                      backgroundColor: Colors.white,
                      onPressed: () {
                        setDialogState(() {
                          urlController.text = ApiConfig.defaultLanUrl;
                          testResult = null;
                        });
                      },
                    ),
                    ActionChip(
                      label: const Text('Emulador (10.0.2.2)', style: TextStyle(fontSize: 11)),
                      backgroundColor: Colors.white,
                      onPressed: () {
                        setDialogState(() {
                          urlController.text = ApiConfig.defaultEmulatorUrl;
                          testResult = null;
                        });
                      },
                    ),
                    ActionChip(
                      label: const Text('Localhost', style: TextStyle(fontSize: 11)),
                      backgroundColor: Colors.white,
                      onPressed: () {
                        setDialogState(() {
                          urlController.text = 'http://localhost:4000';
                          testResult = null;
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF0284C7),
                      side: const BorderSide(color: Color(0xFF0284C7)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: isTesting
                        ? null
                        : () async {
                            final target = urlController.text.trim().replaceAll(RegExp(r'/+$'), '');
                            if (target.isEmpty) return;

                            setDialogState(() {
                              isTesting = true;
                              testResult = null;
                            });

                            try {
                              final response = await http
                                  .get(Uri.parse('$target/api/health'))
                                  .timeout(const Duration(seconds: 4));

                              if (response.statusCode >= 200 && response.statusCode < 300) {
                                setDialogState(() {
                                  isTesting = false;
                                  testSuccess = true;
                                  testResult = '¡Conexión exitosa! El backend y PostgreSQL responden OK.';
                                });
                              } else {
                                setDialogState(() {
                                  isTesting = false;
                                  testSuccess = false;
                                  testResult = 'Respuesta inesperada (${response.statusCode})';
                                });
                              }
                            } catch (_) {
                              setDialogState(() {
                                isTesting = false;
                                testSuccess = false;
                                testResult = 'No se pudo conectar: verifica que el backend esté arriba.';
                              });
                            }
                          },
                    icon: isTesting
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.wifi_find_rounded, size: 16),
                    label: Text(isTesting ? 'Probando...' : 'Probar Conexión'),
                  ),
                ),

                if (testResult != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: testSuccess ? const Color(0xFFF0FDF4) : const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: testSuccess ? const Color(0xFFBBF7D0) : const Color(0xFFFECACA),
                      ),
                    ),
                    child: Text(
                      testResult!,
                      style: TextStyle(
                        fontSize: 11,
                        color: testSuccess ? const Color(0xFF166534) : const Color(0xFF991B1B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogCtx).pop(),
              child: const Text('Cancelar', style: TextStyle(color: Color(0xFF64748B))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () async {
                final newUrl = urlController.text.trim();
                final nav = Navigator.of(dialogCtx);
                final messenger = ScaffoldMessenger.of(context);
                if (newUrl.isNotEmpty) {
                  await ApiConfig.setBaseUrl(newUrl);
                  nav.pop();
                  messenger.showSnackBar(
                    SnackBar(
                      content: Text('Servidor configurado: $newUrl'),
                      backgroundColor: const Color(0xFF0D9488),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  setState(() {});
                }
              },
              child: const Text('Guardar'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFFEDF3F8),
      body: Stack(
        children: [
          // ==========================================================
          // ESFERAS 3D VOLUMÉTRICAS SUAVES DE FONDO
          // ==========================================================
          // Esfera 1: Azul Médico (Superior Izquierda)
          Positioned(
            top: -90,
            left: -90,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const RadialGradient(
                  center: Alignment(-0.35, -0.4),
                  radius: 0.9,
                  colors: [
                    Colors.white,
                    Color(0xFFBAE6FD),
                    Color(0xFF0284C7),
                    Color(0xFF0369A1),
                  ],
                  stops: [0.0, 0.28, 0.72, 1.0],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.24),
                    offset: const Offset(18, 22),
                    blurRadius: 40,
                  ),
                ],
              ),
            ),
          ),

          // Esfera 2: Teal Clínico (Inferior Derecha)
          Positioned(
            bottom: -90,
            right: -90,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const RadialGradient(
                  center: Alignment(-0.35, -0.4),
                  radius: 0.9,
                  colors: [
                    Colors.white,
                    Color(0xFF99F6E4),
                    Color(0xFF0D9488),
                    Color(0xFF0F766E),
                  ],
                  stops: [0.0, 0.28, 0.72, 1.0],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0D9488).withValues(alpha: 0.24),
                    offset: const Offset(18, 22),
                    blurRadius: 40,
                  ),
                ],
              ),
            ),
          ),

          // Esfera 3: Perla Translúcida (Superior Derecha)
          Positioned(
            top: 60,
            right: -45,
            child: Container(
              width: 160,
              height: 160,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const RadialGradient(
                  center: Alignment(-0.35, -0.4),
                  radius: 0.9,
                  colors: [
                    Colors.white,
                    Color(0xFFF0F7FF),
                    Color(0xFFDBEAFE),
                    Color(0xFF94A3B8),
                  ],
                  stops: [0.0, 0.35, 0.75, 1.0],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF94A3B8).withValues(alpha: 0.22),
                    offset: const Offset(12, 16),
                    blurRadius: 30,
                  ),
                ],
              ),
            ),
          ),

          // ==========================================================
          // CONTENIDO PRINCIPAL CON TARJETA NEUMÓRFICA 3D
          // ==========================================================
          SafeArea(
            child: Column(
              children: [
                // Barra Superior con Botón de Ajustes de Servidor
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEEF4FA),
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: const [
                                BoxShadow(
                                  color: Colors.white,
                                  offset: Offset(-2, -2),
                                  blurRadius: 5,
                                ),
                                BoxShadow(
                                  color: Color(0x44A3BDD6),
                                  offset: Offset(2, 2),
                                  blurRadius: 5,
                                ),
                              ],
                            ),
                            child: const Icon(Icons.favorite_rounded, color: Color(0xFF0D9488), size: 18),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'CLÍNICA INTEGRAL',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),

                      // Botón Servidor Neumórfico Circular
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFFEEF4FA),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.9), width: 1.2),
                          boxShadow: const [
                            BoxShadow(
                              color: Colors.white,
                              offset: Offset(-3, -3),
                              blurRadius: 6,
                            ),
                            BoxShadow(
                              color: Color(0x55A3BDD6),
                              offset: Offset(3, 3),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                        child: IconButton(
                          padding: EdgeInsets.zero,
                          icon: const Icon(Icons.settings_outlined, color: Color(0xFF0284C7), size: 18),
                          tooltip: 'Configurar Servidor',
                          onPressed: _showServerConfigDialog,
                        ),
                      ),
                    ],
                  ),
                ),

                // Tarjeta Neumórfica Central con Flip 3D
                Expanded(
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 400),
                        transitionBuilder: (Widget child, Animation<double> animation) {
                          final isRegister = child.key == const ValueKey('register_form');
                          final rotate = Tween<double>(
                            begin: isRegister ? 0.35 : -0.35,
                            end: 0.0,
                          ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic));
                          final fade = CurvedAnimation(parent: animation, curve: Curves.easeOut);

                          return AnimatedBuilder(
                            animation: animation,
                            child: child,
                            builder: (context, widgetChild) {
                              return FadeTransition(
                                opacity: fade,
                                child: Transform(
                                  transform: Matrix4.identity()
                                    ..setEntry(3, 2, 0.0012)
                                    ..rotateY(rotate.value),
                                  alignment: Alignment.center,
                                  child: widgetChild,
                                ),
                              );
                            },
                          );
                        },
                        child: _isRegisterMode
                            ? _buildRegisterCard(auth, key: const ValueKey('register_form'))
                            : _buildLoginCard(auth, key: const ValueKey('login_form')),
                      ),
                    ),
                  ),
                ),

                // Pie de página sutil
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: Text(
                    '© Clínica Integral • Portal Médico',
                    style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================================
  // TARJETA DE INICIO DE SESIÓN (LOGIN)
  // ==========================================================
  Widget _buildLoginCard(AuthProvider auth, {required Key key}) {
    return Container(
      key: key,
      width: double.infinity,
      constraints: const BoxConstraints(maxWidth: 420),
      padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 28),
      decoration: BoxDecoration(
        color: const Color(0xFFEEF4FA),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white.withValues(alpha: 0.85), width: 1.5),
        boxShadow: const [
          BoxShadow(
            color: Colors.white,
            offset: Offset(-10, -10),
            blurRadius: 24,
          ),
          BoxShadow(
            color: Color(0x66A3BDD6),
            offset: Offset(10, 10),
            blurRadius: 24,
          ),
        ],
      ),
      child: Form(
        key: _loginFormKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Icono Superior en Relieve Cuadrado
            Center(
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF4FA),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.9), width: 1.5),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.white,
                      offset: Offset(-5, -5),
                      blurRadius: 12,
                    ),
                    BoxShadow(
                      color: Color(0x55A3BDD6),
                      offset: Offset(5, 5),
                      blurRadius: 12,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.lock_rounded,
                  size: 32,
                  color: Color(0xFF0284C7),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Título
            const Text(
              'INICIAR SESIÓN',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Portal de Pacientes y Especialistas',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 24),

            // Campo Correo Electrónico
            _buildNeumorphicInput(
              controller: _loginEmailController,
              hint: 'Correo Electrónico',
              icon: Icons.email_rounded,
              keyboardType: TextInputType.emailAddress,
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Ingresa tu correo';
                if (!v.contains('@')) return 'Correo no válido';
                return null;
              },
            ),
            const SizedBox(height: 14),

            // Campo Contraseña
            _buildNeumorphicInput(
              controller: _loginPasswordController,
              hint: 'Contraseña',
              icon: Icons.lock_outline_rounded,
              obscureText: _obscureLoginPassword,
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureLoginPassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                  color: const Color(0xFF64748B),
                  size: 20,
                ),
                onPressed: () => setState(() => _obscureLoginPassword = !_obscureLoginPassword),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Ingresa tu contraseña';
                return null;
              },
            ),
            const SizedBox(height: 10),

            // Fila Recordarme
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    SizedBox(
                      height: 24,
                      width: 24,
                      child: Checkbox(
                        value: _rememberMe,
                        activeColor: const Color(0xFF0284C7),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                        onChanged: (val) => setState(() => _rememberMe = val ?? true),
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Recordarme',
                      style: TextStyle(fontSize: 12, color: Color(0xFF475569), fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Contacta a recepción para restablecer tu acceso.'),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  child: const Text(
                    '¿Olvidaste clave?',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF0284C7),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Botón Principal Login
            _buildNeumorphicButton(
              label: 'INGRESAR AL SISTEMA',
              isLoading: auth.isLoading,
              gradientColors: const [Color(0xFF0284C7), Color(0xFF0D9488)],
              onPressed: auth.isLoading ? null : _submitLogin,
            ),
            const SizedBox(height: 22),

            // Fila inferior de cambio animado a Registro
            Container(
              padding: const EdgeInsets.only(top: 16),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFFD6E2EE), width: 1)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '¿No tienes una cuenta?',
                    style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                  ),
                  // Botón Circular '+'
                  _buildCircularButton(
                    icon: Icons.add_rounded,
                    color: const Color(0xFF0284C7),
                    tooltip: 'Crear nueva cuenta',
                    onTap: () => setState(() => _isRegisterMode = true),
                  ),
                ],
              ),
            ),

            // Píldoras de Credenciales Demo
            const SizedBox(height: 10),
            Center(
              child: TextButton.icon(
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF64748B),
                  textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                ),
                onPressed: () => setState(() => _showDemoPills = !_showDemoPills),
                icon: const Icon(Icons.auto_awesome_rounded, size: 14, color: Color(0xFF0D9488)),
                label: Text(_showDemoPills ? 'Ocultar Accesos Demo' : 'Accesos Demo de Prueba'),
              ),
            ),

            if (_showDemoPills) ...[
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildDemoChip('Admin', () => _fillDemo('admin@clinica.com', 'Admin123!', 'Admin'), Icons.security_rounded, const Color(0xFF9333EA)),
                  _buildDemoChip('Médico', () => _fillDemo('dr.garcia@clinica.com', 'Doctor123!', 'Médico'), Icons.medical_services_rounded, const Color(0xFF0284C7)),
                  _buildDemoChip('Paciente', () => _fillDemo('paciente@clinica.com', 'Paciente123!', 'Paciente'), Icons.person_rounded, const Color(0xFF0D9488)),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ==========================================================
  // TARJETA DE REGISTRO (CREAR CUENTA)
  // ==========================================================
  Widget _buildRegisterCard(AuthProvider auth, {required Key key}) {
    return Container(
      key: key,
      width: double.infinity,
      constraints: const BoxConstraints(maxWidth: 420),
      padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 28),
      decoration: BoxDecoration(
        color: const Color(0xFFEEF4FA),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white.withValues(alpha: 0.85), width: 1.5),
        boxShadow: const [
          BoxShadow(
            color: Colors.white,
            offset: Offset(-10, -10),
            blurRadius: 24,
          ),
          BoxShadow(
            color: Color(0x66A3BDD6),
            offset: Offset(10, 10),
            blurRadius: 24,
          ),
        ],
      ),
      child: Form(
        key: _registerFormKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Icono Superior en Relieve Cuadrado
            Center(
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF4FA),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.9), width: 1.5),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.white,
                      offset: Offset(-5, -5),
                      blurRadius: 12,
                    ),
                    BoxShadow(
                      color: Color(0x55A3BDD6),
                      offset: Offset(5, 5),
                      blurRadius: 12,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.person_add_rounded,
                  size: 32,
                  color: Color(0xFF0D9488),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Título
            const Text(
              'CREAR CUENTA',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Registro de Paciente en Clínica Integral',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 20),

            // Campo Nombre Completo
            _buildNeumorphicInput(
              controller: _registerNameController,
              hint: 'Nombre Completo',
              icon: Icons.badge_outlined,
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Ingresa tu nombre completo';
                return null;
              },
            ),
            const SizedBox(height: 12),

            // Campo Correo Electrónico
            _buildNeumorphicInput(
              controller: _registerEmailController,
              hint: 'Correo Electrónico',
              icon: Icons.email_rounded,
              keyboardType: TextInputType.emailAddress,
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Ingresa tu correo';
                if (!v.contains('@')) return 'Correo no válido';
                return null;
              },
            ),
            const SizedBox(height: 12),

            // Campo Teléfono (Opcional)
            _buildNeumorphicInput(
              controller: _registerPhoneController,
              hint: 'Teléfono (Opcional)',
              icon: Icons.phone_android_rounded,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),

            // Campo Contraseña
            _buildNeumorphicInput(
              controller: _registerPasswordController,
              hint: 'Contraseña (mín. 6 car.)',
              icon: Icons.lock_outline_rounded,
              obscureText: _obscureRegisterPassword,
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureRegisterPassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                  color: const Color(0xFF64748B),
                  size: 20,
                ),
                onPressed: () => setState(() => _obscureRegisterPassword = !_obscureRegisterPassword),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Ingresa tu contraseña';
                if (v.length < 6) return 'Mínimo 6 caracteres';
                return null;
              },
            ),
            const SizedBox(height: 12),

            // Campo Confirmar Contraseña
            _buildNeumorphicInput(
              controller: _registerConfirmPasswordController,
              hint: 'Confirmar Contraseña',
              icon: Icons.check_circle_outline_rounded,
              obscureText: _obscureRegisterConfirmPassword,
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureRegisterConfirmPassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                  color: const Color(0xFF64748B),
                  size: 20,
                ),
                onPressed: () => setState(() => _obscureRegisterConfirmPassword = !_obscureRegisterConfirmPassword),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Confirma tu contraseña';
                return null;
              },
            ),
            const SizedBox(height: 20),

            // Botón Principal Registro
            _buildNeumorphicButton(
              label: 'CREAR CUENTA',
              isLoading: auth.isLoading,
              gradientColors: const [Color(0xFF0D9488), Color(0xFF0284C7)],
              onPressed: auth.isLoading ? null : _submitRegister,
            ),
            const SizedBox(height: 22),

            // Fila inferior de cambio animado a Login
            Container(
              padding: const EdgeInsets.only(top: 16),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFFD6E2EE), width: 1)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '¿Ya tienes una cuenta?',
                    style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                  ),
                  // Botón Circular '←'
                  _buildCircularButton(
                    icon: Icons.arrow_back_rounded,
                    color: const Color(0xFF0D9488),
                    tooltip: 'Volver a Iniciar Sesión',
                    onTap: () => setState(() => _isRegisterMode = false),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================================
  // HELPERS DE COMPONENTES NEUMÓRFICOS
  // ==========================================================
  Widget _buildNeumorphicInput({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool obscureText = false,
    TextInputType? keyboardType,
    Widget? suffixIcon,
    String? Function(String?)? validator,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFEAF0F6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8), width: 1.2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33A3BDD6),
            offset: Offset(2, 2),
            blurRadius: 6,
          ),
        ],
      ),
      child: TextFormField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        validator: validator,
        style: const TextStyle(
          fontSize: 13.5,
          color: Color(0xFF0F172A),
          fontWeight: FontWeight.w600,
        ),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8), fontWeight: FontWeight.w500),
          prefixIcon: Icon(icon, size: 20, color: const Color(0xFF64748B)),
          suffixIcon: suffixIcon,
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          errorBorder: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        ),
      ),
    );
  }

  Widget _buildNeumorphicButton({
    required String label,
    required bool isLoading,
    required List<Color> gradientColors,
    required VoidCallback? onPressed,
  }) {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: gradientColors.first.withValues(alpha: 0.35),
            offset: const Offset(0, 6),
            blurRadius: 14,
          ),
        ],
      ),
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        onPressed: onPressed,
        child: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
              )
            : Text(
                label,
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.1,
                  color: Colors.white,
                ),
              ),
      ),
    );
  }

  Widget _buildCircularButton({
    required IconData icon,
    required Color color,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFFEEF4FA),
        border: Border.all(color: Colors.white.withValues(alpha: 0.9), width: 1.5),
        boxShadow: const [
          BoxShadow(
            color: Colors.white,
            offset: Offset(-3, -3),
            blurRadius: 8,
          ),
          BoxShadow(
            color: Color(0x55A3BDD6),
            offset: Offset(3, 3),
            blurRadius: 8,
          ),
        ],
      ),
      child: IconButton(
        padding: EdgeInsets.zero,
        icon: Icon(icon, color: color, size: 22),
        tooltip: tooltip,
        onPressed: onTap,
      ),
    );
  }

  Widget _buildDemoChip(String title, VoidCallback onTap, IconData icon, Color color) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFFEEF4FA),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
          boxShadow: const [
            BoxShadow(
              color: Colors.white,
              offset: Offset(-2, -2),
              blurRadius: 5,
            ),
            BoxShadow(
              color: Color(0x35A3BDD6),
              offset: Offset(2, 2),
              blurRadius: 5,
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 4),
            Text(
              title,
              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
            ),
          ],
        ),
      ),
    );
  }
}
