<?php

namespace Tests\Feature;

use App\Domains\Page\Models\Page;
use App\Models\Admin;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GodModePagesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('admin_activity_logs');
        Schema::dropIfExists('deleted_items');
        Schema::dropIfExists('pages');
        Schema::dropIfExists('admins');

        Schema::create('admins', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role')->default('admin');
            $table->string('avatar_url')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('pages', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->string('slug', 100)->unique();
            $table->string('mode');
            $table->longText('content');
            $table->boolean('is_published')->default(false);
            $table->foreignId('created_by_admin_id')->nullable();
            $table->foreignId('updated_by_admin_id')->nullable();
            $table->timestamps();
        });

        Schema::create('admin_activity_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('admin_id');
            $table->string('action');
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });

        Schema::create('deleted_items', function (Blueprint $table): void {
            $table->id();
            $table->string('table_name');
            $table->unsignedBigInteger('record_id');
            $table->json('data');
            $table->string('deleted_by')->nullable();
            $table->timestamps();
        });
    }

    public function test_page_management_requires_god_mode_authentication(): void
    {
        $this->get('/god-mode/pages')
            ->assertRedirect(route('god-mode.login'));
    }

    public function test_admin_can_create_a_basic_page_and_unsafe_html_is_sanitized(): void
    {
        $admin = $this->authenticateAdmin();

        $this->post('/god-mode/pages', [
            'title' => 'Tentang Kami',
            'slug' => 'tentang-kami',
            'mode' => 'basic',
            'content' => '<p>Hello <strong>world</strong></p><script>alert(1)</script>',
            'is_published' => true,
        ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $page = Page::where('slug', 'tentang-kami')->firstOrFail();

        $this->assertStringContainsString('<strong>world</strong>', $page->content);
        $this->assertStringNotContainsString('<script', $page->content);
        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'Created page /tentang-kami',
        ]);
    }

    public function test_system_routes_are_reported_as_unavailable_and_rejected_on_save(): void
    {
        $this->authenticateAdmin();

        $this->getJson('/god-mode/pages/check-slug?slug=login')
            ->assertOk()
            ->assertJson([
                'available' => false,
                'message' => 'URL sudah digunakan oleh fitur sistem.',
            ]);

        $this->getJson('/god-mode/pages/check-slug?slug=language')
            ->assertOk()
            ->assertJson(['available' => false]);

        $this->post('/god-mode/pages', [
            'title' => 'Login Collision',
            'slug' => 'login',
            'mode' => 'basic',
            'content' => '<p>Not allowed</p>',
            'is_published' => true,
        ])
            ->assertSessionHasErrors('slug');

        $this->assertDatabaseMissing('pages', ['slug' => 'login']);
    }

    public function test_management_views_receive_typed_page_resource_shapes(): void
    {
        $this->authenticateAdmin();
        $page = Page::create([
            'title' => 'Resource Shape',
            'slug' => 'resource-shape',
            'mode' => 'basic',
            'content' => '<p>Content</p>',
            'is_published' => true,
        ]);

        $this->get('/god-mode/pages')
            ->assertOk()
            ->assertInertia(fn (Assert $inertia) => $inertia
                ->component('GodMode/Pages/Index')
                ->where('pages.data.0.title', 'Resource Shape')
                ->where('pages.data.0.mode', 'basic'));

        $this->get("/god-mode/pages/{$page->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $inertia) => $inertia
                ->component('GodMode/Pages/Edit')
                ->where('page.title', 'Resource Shape')
                ->where('page.slug', 'resource-shape'));
    }

    public function test_full_html_page_is_returned_without_application_markup_and_with_popup_safe_sandbox(): void
    {
        Page::create([
            'title' => 'Campaign',
            'slug' => 'campaign',
            'mode' => 'full_html',
            'content' => '<!DOCTYPE html><html><head><style>body{color:red}</style></head><body><main>Custom campaign</main></body></html>',
            'is_published' => true,
        ]);

        $this->get('/campaign')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=UTF-8')
            ->assertHeader(
                'Content-Security-Policy',
                'sandbox allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-scripts',
            )
            ->assertSee('<style>body{color:red}</style>', false)
            ->assertDontSee('resources/css/app.css', false)
            ->assertDontSee('data-page=', false);
    }

    public function test_basic_page_uses_the_public_inertia_view_and_is_sanitized_again_on_read(): void
    {
        Page::create([
            'title' => 'Info',
            'slug' => 'info',
            'mode' => 'basic',
            'content' => '<p>Public info</p><script>alert(1)</script>',
            'is_published' => true,
        ]);

        $this->get('/info')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('PublicPages/Show')
                ->where('page.title', 'Info')
                ->where('page.content', '<p>Public info</p>'));
    }

    public function test_draft_page_is_not_publicly_accessible(): void
    {
        Page::create([
            'title' => 'Draft',
            'slug' => 'draft-page',
            'mode' => 'basic',
            'content' => '<p>Draft content</p>',
            'is_published' => false,
        ]);

        $this->get('/draft-page')->assertNotFound();
    }

    private function createAdmin(): Admin
    {
        return Admin::create([
            'name' => 'God Admin',
            'email' => 'god@example.test',
            'password' => 'secret-password',
            'role' => 'superadmin',
        ]);
    }

    private function authenticateAdmin(): Admin
    {
        $admin = $this->createAdmin();
        auth('admin')->login($admin);

        return $admin;
    }
}
